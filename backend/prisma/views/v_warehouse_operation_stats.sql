-- 仓库运营统计视图
-- 包含: 仓库信息 + 今日出入库量 + 库存周转率 + 异常订单数

CREATE OR REPLACE VIEW v_warehouse_operation_stats AS
SELECT
  w.id AS warehouse_id,
  w.name AS warehouse_name,
  w.capacity,
  w.current_stock,
  ROUND((w.current_stock::NUMERIC / NULLIF(w.capacity, 0)) * 100, 2) AS stock_usage_rate,
  COUNT(DISTINCT CASE 
    WHEN wt.transaction_date::DATE = CURRENT_DATE 
    AND wt.transaction_type = 'OUT' 
    THEN wt.id 
  END) AS today_out_count,
  COUNT(DISTINCT CASE 
    WHEN wt.transaction_date::DATE = CURRENT_DATE 
    AND wt.transaction_type = 'IN' 
    THEN wt.id 
  END) AS today_in_count,
  COALESCE(SUM(CASE 
    WHEN wt.transaction_date::DATE = CURRENT_DATE 
    AND wt.transaction_type = 'OUT' 
    THEN wt.quantity 
    ELSE 0 
  END), 0) AS today_out_quantity,
  COALESCE(SUM(CASE 
    WHEN wt.transaction_date::DATE = CURRENT_DATE 
    AND wt.transaction_type = 'IN' 
    THEN wt.quantity 
    ELSE 0 
  END), 0) AS today_in_quantity,
  COUNT(DISTINCT CASE 
    WHEN o.status = 'DELIVERED' 
    AND o.warehouse_id = w.id 
    THEN o.id 
  END) AS completed_orders,
  COUNT(DISTINCT CASE 
    WHEN oe.id IS NOT NULL 
    AND o.warehouse_id = w.id 
    THEN oe.id 
  END) AS exception_orders,
  COUNT(DISTINCT o.id) AS total_orders
FROM warehouses w
LEFT JOIN warehouse_transactions wt ON w.id = wt.warehouse_id
LEFT JOIN orders o ON w.id = o.warehouse_id
LEFT JOIN order_exceptions oe ON o.id = oe.order_id
GROUP BY w.id, w.name, w.capacity, w.current_stock;

