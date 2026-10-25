-- Góc thử đồ (25/10/2026, Anna): no laptop sleeve to try on. Run BEFORE
-- merging. Turn it back on in admin → Sản phẩm → Sửa → Đeo thử.
-- (The Origami pouch stays as it was: a key ring clipped to the bag.)
update public.products set wear = null where sku = 'tui-laptop';
