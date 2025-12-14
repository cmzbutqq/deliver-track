-- 物流公司统计视图
-- 包含: 物流公司名称、订单数、平均时效、客户满意度、总费用

CREATE OR REPLACE VIEW v_logistics_company_statistics AS
SELECT 
  lc.name AS logistics_company_name,
  lc.speed,
  COUNT(o.id) AS total_orders,
  COUNT(CASE WHEN o.status = 'DELIVERED' THEN o.id END) AS delivered_orders,
  COUNT(CASE WHEN o.status = 'SHIPPING' THEN o.id END) AS shipping_orders,
  COUNT(CASE WHEN o.status = 'PENDING' THEN o.id END) AS pending_orders,
  COUNT(CASE WHEN o.status = 'CANCELLED' THEN o.id END) AS cancelled_orders,
  COALESCE(
    AVG(CASE 
      WHEN o.status = 'DELIVERED' AND o.actual_time IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (o.actual_time - o.created_at)) / 3600
    END),
    0
  ) AS avg_delivery_time_hours,
  COALESCE(AVG(cr.rating), 0) AS avg_customer_rating,
  COUNT(cr.id) AS review_count,
  COALESCE(SUM(df.total_fee), 0) AS total_fees,
  COALESCE(AVG(df.total_fee), 0) AS avg_fee
FROM logistics_companies lc
LEFT JOIN orders o ON lc.name = o.logistics
LEFT JOIN customer_reviews cr ON o.id = cr.order_id
LEFT JOIN delivery_fees df ON o.id = df.order_id
GROUP BY lc.name, lc.speed;

