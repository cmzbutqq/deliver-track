-- 商家订单汇总视图
-- 包含: 商家ID、今日订单数、总订单数、总金额、平均金额、平均时效、完成率

CREATE OR REPLACE VIEW v_merchant_order_summary AS
SELECT 
  m.id AS merchant_id,
  m.username AS merchant_username,
  m.name AS merchant_name,
  COUNT(o.id) AS total_orders,
  COUNT(CASE WHEN DATE(o.created_at) = CURRENT_DATE THEN o.id END) AS today_orders,
  COALESCE(SUM(o.amount), 0) AS total_amount,
  COALESCE(AVG(o.amount), 0) AS avg_amount,
  COUNT(CASE WHEN o.status = 'DELIVERED' THEN o.id END) AS delivered_orders,
  CASE 
    WHEN COUNT(o.id) > 0 THEN 
      COUNT(CASE WHEN o.status = 'DELIVERED' THEN o.id END)::DOUBLE PRECISION / COUNT(o.id)::DOUBLE PRECISION
    ELSE 0
  END AS delivery_rate,
  COALESCE(
    AVG(CASE 
      WHEN o.status = 'DELIVERED' AND o.actual_time IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (o.actual_time - o.created_at)) / 3600
    END),
    0
  ) AS avg_delivery_time_hours
FROM merchants m
LEFT JOIN orders o ON m.id = o.merchant_id
GROUP BY m.id, m.username, m.name;

