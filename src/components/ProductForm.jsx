"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProductForm({ productId = null }) {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [allocations, setAllocations] = useState({});
  const [form, setForm] = useState({
    name: "", sku: "", barcode: "", categoryId: "", costPrice: "", sellingPrice: "",
    reorderLevel: 10, description: "", expiryDate: "", batchNumber: "", isActive: true,
    genericName: "", brandName: "", packSize: "", manufacturer: "", prescriptionRequired: false,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stockAdd, setStockAdd] = useState({ quantity: "", expiryDate: "", batchNumber: "" });
  const [branchStocks, setBranchStocks] = useState({}); // branchId -> { quantityInStock, sellingPrice }
  const [myBranchId, setMyBranchId] = useState(null); // branch-bound staff may only price their own

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.data || []));
    fetch("/api/branches").then((r) => r.json()).then((d) => setBranches((d.data || []).filter((b) => b.isActive)));
    if (productId) {
      fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then((d) => setMyBranchId(d?.user?.branchId || null)).catch(() => {});
      fetch(`/api/products/${productId}`).then((r) => r.json()).then((d) => {
        const p = d.data;
        setBranchStocks(Object.fromEntries((p.branchStocks || []).map((b) => [b.branchId, b])));
        setForm((f) => ({
          ...f, name: p.name, sku: p.sku, barcode: p.barcode || "", categoryId: p.categoryId,
          costPrice: p.costPrice ?? "", sellingPrice: p.sellingPrice,
          reorderLevel: p.reorderLevel, description: p.description || "", isActive: p.isActive,
          genericName: p.genericName || "", brandName: p.brandName || "",
          packSize: p.packSize || "", manufacturer: p.manufacturer || "",
          prescriptionRequired: !!p.prescriptionRequired,
        }));
      });
    }
  }, [productId]);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const branchAllocations = Object.entries(allocations)
      .map(([branchId, quantity]) => ({ branchId, quantity: Number(quantity) || 0 }))
      .filter((a) => a.quantity > 0);
    const res = await fetch(productId ? `/api/products/${productId}` : "/api/products", {
      method: productId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productId ? form : { ...form, branchAllocations }),
    });
    setBusy(false);
    if (res.ok) router.push("/products");
    else setError((await res.json()).message || "Save failed.");
  }

  async function addStock() {
    if (!stockAdd.quantity) return;
    const res = await fetch("/api/products/add-stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, ...stockAdd }),
    });
    if (res.ok) router.refresh();
    else setError((await res.json()).message || "Failed to add stock.");
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  return (
    <form onSubmit={submit} className="card p-6 space-y-4 max-w-3xl">
      {error && <div className="rounded-lg bg-rose-50 text-rose-700 text-sm px-3 py-2">{error}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="label">Name *</label><input className="input" required value={form.name} onChange={set("name")} /></div>
        <div><label className="label">Category *</label>
          <select className="input" required value={form.categoryId} onChange={set("categoryId")}>
            <option value="">Select category…</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div><label className="label">SKU *</label><input className="input" required value={form.sku} onChange={set("sku")} /></div>
        <div><label className="label">Barcode</label><input className="input" value={form.barcode} onChange={set("barcode")} /></div>
        {/* <div><label className="label">IMEI (phones optional)</label><input className="input" value={form.imei} onChange={set("imei")} /></div> */}
        <div><label className="label">Cost price (KSh)</label><input type="number" step="0.01" className="input" value={form.costPrice} onChange={set("costPrice")} /></div>
        <div><label className="label">{productId ? "Default selling price (KSh) *" : "Selling price (KSh) *"}</label><input type="number" step="0.01" className="input" required value={form.sellingPrice} onChange={set("sellingPrice")} /></div>
        <div><label className="label">Active Ingredient / Generic</label><input className="input" placeholder="e.g. Glyphosate 480g/L, Oxytetracycline 20%" value={form.genericName} onChange={set("genericName")} /></div>
        <div><label className="label">Brand / Trade Name</label><input className="input" placeholder="e.g. Roundup, Alamycin, Dekalb" value={form.brandName} onChange={set("brandName")} /></div>
        <div><label className="label">Pack Size</label><input className="input" placeholder="e.g. 50kg, 2kg, 1L, 100ml, 50g" value={form.packSize} onChange={set("packSize")} /></div>
        <div><label className="label">Manufacturer / Supplier</label><input className="input" placeholder="e.g. Kenya Seed, Norbrook, Bayer" value={form.manufacturer} onChange={set("manufacturer")} /></div>
        {!productId && (
          <div><label className="label">Expiry date (optional)</label><input type="date" className="input" value={form.expiryDate} onChange={set("expiryDate")} /></div>
        )}
        <div><label className="label">Reorder level</label><input type="number" className="input" value={form.reorderLevel} onChange={set("reorderLevel")} /></div>
        <div className="flex items-center gap-4 pb-2">
          <div className="flex items-center gap-2">
            <input id="active" type="checkbox" checked={form.isActive} onChange={set("isActive")} />
            <label htmlFor="active" className="text-sm">Active</label>
          </div>
          <div className="flex items-center gap-2">
            <input id="pom" type="checkbox" checked={form.prescriptionRequired} onChange={set("prescriptionRequired")} />
            <label htmlFor="pom" className="text-sm font-medium text-amber-700">Prescription / POM</label>
          </div>
        </div>
      </div>
      <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={set("description")} /></div>
      {!productId && branches.length > 0 && (
        <div className="border-t border-slate-100 pt-4">
          <div className="label mb-2">Opening stock per branch</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {branches.map((b) => (
              <div key={b.id}>
                <label className="label">{b.name}{b.isMain ? " (Main)" : ""}</label>
                <input type="number" min="0" className="input" placeholder="0"
                  value={allocations[b.id] ?? ""}
                  onChange={(e) => setAllocations({ ...allocations, [b.id]: e.target.value })} />
              </div>
            ))}
          </div>
          <div className="text-sm text-slate-500 mt-2">
            Total opening stock: {Object.values(allocations).reduce((s, q) => s + (Number(q) || 0), 0)}
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : productId ? "Save changes" : "Create product"}</button>
        <button type="button" className="btn-secondary" onClick={() => router.push("/products")}>Cancel</button>
      </div>

      {productId && branches.length > 0 && (
        <BranchPrices
          productId={productId}
          branches={branches}
          branchStocks={branchStocks}
          defaultPrice={Number(form.sellingPrice) || 0}
          myBranchId={myBranchId}
          onSaved={(branchId, sellingPrice) =>
            setBranchStocks((b) => ({ ...b, [branchId]: { ...(b[branchId] || { quantityInStock: 0 }), sellingPrice } }))}
        />
      )}

      {productId && (
        <div className="border-t border-slate-100 pt-4">
          <div className="label mb-2">Receive stock into main branch</div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <input type="number" className="input" placeholder="Quantity" value={stockAdd.quantity}
              onChange={(e) => setStockAdd({ ...stockAdd, quantity: e.target.value })} />
            <input className="input" placeholder="Batch no. (optional)" value={stockAdd.batchNumber}
              onChange={(e) => setStockAdd({ ...stockAdd, batchNumber: e.target.value })} />
            <input type="date" className="input" value={stockAdd.expiryDate}
              onChange={(e) => setStockAdd({ ...stockAdd, expiryDate: e.target.value })} />
            <button type="button" className="btn-secondary" onClick={addStock}>Add stock</button>
          </div>
        </div>
      )}
    </form>
  );
}

const money = (n) => `KSh ${Number(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;

/** One row per branch: blank price = the branch sells at the default price. */
function BranchPrices({ productId, branches, branchStocks, defaultPrice, myBranchId, onSaved }) {
  const [drafts, setDrafts] = useState({});
  const [status, setStatus] = useState({}); // branchId -> { busy, ok, error }

  async function save(branchId) {
    const value = drafts[branchId] ?? branchStocks[branchId]?.sellingPrice ?? "";
    setStatus((s) => ({ ...s, [branchId]: { busy: true } }));
    const res = await fetch(`/api/products/${productId}/branch-prices`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId, sellingPrice: value === "" ? null : Number(value) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setStatus((s) => ({ ...s, [branchId]: { error: data.message || "Save failed." } }));
    onSaved(branchId, data.data.sellingPrice);
    setDrafts((d) => { const { [branchId]: _, ...rest } = d; return rest; });
    setStatus((s) => ({ ...s, [branchId]: { ok: true } }));
  }

  return (
    <div className="border-t border-slate-100 pt-4">
      <div className="label mb-1">Branch prices</div>
      <p className="text-xs text-slate-500 mb-3">
        Leave a branch blank to sell at the default price ({defaultPrice > 0 ? money(defaultPrice) : "not set"}).
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-100">
              <th className="py-2 font-medium">Branch</th>
              <th className="py-2 font-medium text-right">In stock</th>
              <th className="py-2 font-medium">Branch price (KSh)</th>
              <th className="py-2 font-medium">Sells at</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => {
              const row = branchStocks[b.id];
              const saved = row?.sellingPrice ?? "";
              const value = drafts[b.id] ?? saved;
              const locked = myBranchId && myBranchId !== b.id;
              const st = status[b.id] || {};
              const effective = Number(value) > 0 ? Number(value) : defaultPrice;
              return (
                <tr key={b.id} className="border-b border-slate-50">
                  <td className="py-2">{b.name}{b.isMain ? " (Main)" : ""}</td>
                  <td className="py-2 text-right tabular-nums">{row?.quantityInStock ?? 0}</td>
                  <td className="py-2 pr-2">
                    <input type="number" min="0" step="0.01" className="input !py-1.5 w-32"
                      placeholder={defaultPrice > 0 ? String(defaultPrice) : "default"}
                      disabled={locked} value={value}
                      onChange={(e) => setDrafts((d) => ({ ...d, [b.id]: e.target.value }))} />
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    {effective > 0 ? money(effective) : <span className="text-amber-700">Not priced</span>}
                    {!(Number(value) > 0) && effective > 0 && <span className="text-xs text-slate-400"> (default)</span>}
                  </td>
                  <td className="py-2 text-right whitespace-nowrap">
                    {locked ? (
                      <span className="text-xs text-slate-400">Other branch</span>
                    ) : (
                      <button type="button" className="btn-secondary !py-1.5"
                        disabled={st.busy || String(value) === String(saved)} onClick={() => save(b.id)}>
                        {st.busy ? "Saving…" : "Save"}
                      </button>
                    )}
                    {st.ok && <div className="text-xs text-emerald-600">Saved</div>}
                    {st.error && <div className="text-xs text-rose-600">{st.error}</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
