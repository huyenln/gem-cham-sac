-- Góc thử đồ (25/10/2026, Anna): no laptop sleeve to try on; the Origami
-- pouch out too (it wasn't in the corner before). Run BEFORE merging.
-- Turn either back on in admin → Sản phẩm → Sửa → Đeo thử.
update public.products set wear = null where sku in ('tui-laptop', 'origami');
