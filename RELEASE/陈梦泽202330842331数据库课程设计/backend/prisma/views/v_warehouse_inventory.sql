-- 仓库库存视图
-- 包含: 仓库ID、名称、总容量、当前库存、库存使用率、出入库记录数

CREATE OR REPLACE VIEW v_warehouse_inventory AS
SELECT 
  w.id AS warehouse_id,
  w.name AS warehouse_name,
  w.manager_name,
  w.manager_phone,
  w.capacity,
  w.current_stock,
  CASE 
    WHEN w.capacity > 0 THEN 
      (w.current_stock::DOUBLE PRECISION / w.capacity::DOUBLE PRECISION) * 100
    ELSE 0
  END AS stock_usage_rate,
  w.status,
  COUNT(CASE WHEN o.status = 'SHIPPING' THEN o.id END) AS shipped_orders_count,
  COUNT(o.id) AS total_orders_count
FROM warehouses w
LEFT JOIN orders o ON w.id = o.warehouse_id
GROUP BY w.id, w.name, w.manager_name, w.manager_phone, w.capacity, w.current_stock, w.status;

