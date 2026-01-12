-- 商家每日统计数据视图
-- 包含: 商家ID、日期、订单数、完成数、总金额、总费用、平均评分等

CREATE OR REPLACE VIEW v_merchant_daily_statistics AS
SELECT 
    m.id AS merchant_id,
    m.username AS merchant_username,
    m.name AS merchant_name,
    DATE(o.created_at) AS stat_date,
    COUNT(o.id) AS total_orders,
    COUNT(CASE WHEN o.status = 'DELIVERED' THEN o.id END) AS completed_orders,
    COALESCE(SUM(o.amount), 0) AS total_amount,
    COALESCE(SUM(o.total_fee), 0) AS total_fee,
    COALESCE(AVG(cr.rating), 0) AS avg_rating,
    COUNT(DISTINCT o.customer_id) AS unique_customers,
    COUNT(DISTINCT o.delivery_driver_id) AS active_drivers
FROM merchants m
LEFT JOIN orders o ON m.id = o.merchant_id
LEFT JOIN customer_reviews cr ON o.id = cr.order_id
GROUP BY m.id, m.username, m.name, DATE(o.created_at)
HAVING COUNT(o.id) > 0;

