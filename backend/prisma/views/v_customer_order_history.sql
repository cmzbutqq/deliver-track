-- 客户订单历史视图
-- 包含: 客户信息、订单完整信息、支付信息、评价信息等

CREATE OR REPLACE VIEW v_customer_order_history AS
SELECT 
    c.id AS customer_id,
    c.name AS customer_name,
    c.phone AS customer_phone,
    o.id AS order_id,
    o."orderNo" AS order_no,
    o.status AS order_status,
    o.amount AS order_amount,
    o.total_fee AS order_fee,
    o.created_at AS order_created_at,
    o.estimated_time AS estimated_delivery_time,
    o.actual_time AS actual_delivery_time,
    p.id AS payment_id,
    p.payment_method,
    p.status AS payment_status,
    p.amount AS payment_amount,
    p.paid_at AS payment_time,
    r.id AS refund_id,
    r.refund_amount,
    r.status AS refund_status,
    cr.id AS review_id,
    cr.rating,
    cr.comment AS review_comment,
    cp.available_points,
    cu.discount_amount AS coupon_discount
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
LEFT JOIN payments p ON o.id = p.order_id AND p.status = 'SUCCESS'
LEFT JOIN refunds r ON o.id = r.order_id
LEFT JOIN customer_reviews cr ON o.id = cr.order_id
LEFT JOIN customer_points cp ON c.id = cp.customer_id
LEFT JOIN coupon_usages cu ON o.id = cu.order_id
ORDER BY o.created_at DESC;

