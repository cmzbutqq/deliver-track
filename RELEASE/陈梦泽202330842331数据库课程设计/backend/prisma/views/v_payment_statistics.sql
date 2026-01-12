-- 支付统计视图
-- 包含: 按支付方式、时间段统计支付数据

CREATE OR REPLACE VIEW v_payment_statistics AS
SELECT 
    DATE(p.created_at) AS payment_date,
    p.payment_method,
    COUNT(p.id) AS payment_count,
    COUNT(CASE WHEN p.status = 'SUCCESS' THEN p.id END) AS success_count,
    COUNT(CASE WHEN p.status = 'FAILED' THEN p.id END) AS failed_count,
    COUNT(CASE WHEN p.status = 'PENDING' THEN p.id END) AS pending_count,
    COUNT(CASE WHEN p.status = 'REFUNDED' THEN p.id END) AS refunded_count,
    COALESCE(SUM(p.amount), 0) AS total_amount,
    COALESCE(SUM(CASE WHEN p.status = 'SUCCESS' THEN p.amount END), 0) AS success_amount,
    COALESCE(SUM(CASE WHEN p.status = 'FAILED' THEN p.amount END), 0) AS failed_amount,
    CASE 
        WHEN COUNT(p.id) > 0 THEN 
            COUNT(CASE WHEN p.status = 'SUCCESS' THEN p.id END)::DOUBLE PRECISION / COUNT(p.id)::DOUBLE PRECISION
        ELSE 0
    END AS success_rate,
    AVG(CASE 
        WHEN p.status = 'SUCCESS' AND p.paid_at IS NOT NULL AND p.created_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (p.paid_at - p.created_at))
    END) AS avg_payment_time_seconds
FROM payments p
GROUP BY DATE(p.created_at), p.payment_method
ORDER BY payment_date DESC, p.payment_method;

