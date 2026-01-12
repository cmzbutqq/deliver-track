-- 客户订单汇总视图
-- 包含: 客户ID、客户姓名、订单总数、总金额、平均金额、最近订单时间

CREATE OR REPLACE VIEW v_customer_order_summary AS
SELECT
  c.id AS customer_id,
  c.name AS customer_name,
  c.phone AS customer_phone,
  COUNT(o.id) AS total_orders,
  COALESCE(SUM(o.amount), 0) AS total_amount,
  COALESCE(AVG(o.amount), 0) AS avg_amount,
  MAX(o.created_at) AS last_order_time,
  COUNT(CASE WHEN o.status = 'DELIVERED' THEN 1 END) AS completed_orders,
  COUNT(CASE WHEN o.status = 'SHIPPING' THEN 1 END) AS shipping_orders,
  COUNT(CASE WHEN o.status = 'PENDING' THEN 1 END) AS pending_orders
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.name, c.phone;

