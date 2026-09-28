import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { audit } from "@/lib/audit";

/**
 * PUT { branchId, sellingPrice } — sets one branch's own selling price for this
 * product. sellingPrice null (or blank) clears it, so the branch falls back to
 * the product's default price. Staff tied to a branch may only price their own.
 */
export async function PUT(req, { params }) {
  const { user, error } = await requireAuth("manage_products");
  if (error) return error;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const branchId = String(body.branchId || "");
  if (!branchId) return Response.json({ message: "Choose a branch." }, { status: 422 });
  if (user.branchId && user.branchId !== branchId) {
    return Response.json({ message: "You can only set prices for your own branch." }, { status: 403 });
  }

  const raw = body.sellingPrice;
  const sellingPrice = raw === null || raw === undefined || String(raw).trim() === "" ? null : Number(raw);
  if (sellingPrice !== null && !(Number.isFinite(sellingPrice) && sellingPrice > 0)) {
    return Response.json({ message: "Price must be a number above 0 (or blank to use the default)." }, { status: 422 });
  }

  const [product, branch] = await Promise.all([
    prisma.product.findUnique({ where: { id }, select: { id: true, name: true, sellingPrice: true } }),
    prisma.branch.findUnique({ where: { id: branchId }, select: { id: true, name: true } }),
  ]);
  if (!product) return Response.json({ message: "Product not found." }, { status: 404 });
  if (!branch) return Response.json({ message: "Branch not found." }, { status: 404 });

  const before = await prisma.productBranchStock.findUnique({
    where: { productId_branchId: { productId: id, branchId } },
    select: { sellingPrice: true },
  });
  // Pricing a product a branch doesn't stock yet creates its (empty) shelf row.
  const row = await prisma.productBranchStock.upsert({
    where: { productId_branchId: { productId: id, branchId } },
    update: { sellingPrice },
    create: { productId: id, branchId, quantityInStock: 0, initialAllocation: 0, sellingPrice },
  });

  await audit({
    userId: user.id,
    event: "branch_price_changed",
    type: "Product",
    auditableId: id,
    oldValues: { branch: branch.name, sellingPrice: before?.sellingPrice ?? null },
    newValues: { branch: branch.name, sellingPrice },
    req,
  });
  return Response.json({ data: { branchId, sellingPrice: row.sellingPrice, defaultPrice: product.sellingPrice } });
}
