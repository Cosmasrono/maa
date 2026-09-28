// A product has one default selling price; each branch may override it on its
// ProductBranchStock row. Every place that charges a customer goes through here.

/** The price a branch charges: its own price if set, else the product default. */
export function branchPrice(product, branchStock) {
  const own = branchStock?.sellingPrice;
  return own != null && own > 0 ? own : product.sellingPrice;
}
