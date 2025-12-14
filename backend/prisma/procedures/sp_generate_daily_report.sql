-- 生成每日统计报表存储过程
-- 参数: report_date (DATE, 默认为今天)
-- 返回: JSON格式的每日统计报表

CREATE OR REPLACE FUNCTION sp_generate_daily_report(p_report_date DATE DEFAULT CURRENT_DATE)
RETURNS JSON AS $$
DECLARE
    v_order_stats JSON;
    v_payment_stats JSON;
    v_driver_stats JSON;
    v_merchant_stats JSON;
    v_result JSON;
BEGIN
    -- 订单统计
    SELECT json_build_object(
        'total_orders', COUNT(*),
        'pending_orders', SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END),
        'shipping_orders', SUM(CASE WHEN status = 'SHIPPING' THEN 1 ELSE 0 END),
        'delivered_orders', SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END),
        'cancelled_orders', SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END),
        'total_amount', COALESCE(SUM(amount), 0),
        'total_fee', COALESCE(SUM(total_fee), 0)
    ) INTO v_order_stats
    FROM orders
    WHERE DATE(created_at) = p_report_date;
    
    -- 支付统计
    SELECT json_build_object(
        'total_payments', COUNT(*),
        'success_payments', SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END),
        'failed_payments', SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END),
        'total_amount', COALESCE(SUM(amount), 0),
        'alipay_amount', COALESCE(SUM(CASE WHEN payment_method = 'ALIPAY' THEN amount ELSE 0 END), 0),
        'wechat_amount', COALESCE(SUM(CASE WHEN payment_method = 'WECHAT' THEN amount ELSE 0 END), 0),
        'bank_card_amount', COALESCE(SUM(CASE WHEN payment_method = 'BANK_CARD' THEN amount ELSE 0 END), 0),
        'balance_amount', COALESCE(SUM(CASE WHEN payment_method = 'BALANCE' THEN amount ELSE 0 END), 0)
    ) INTO v_payment_stats
    FROM payments
    WHERE DATE(created_at) = p_report_date;
    
    -- 配送员统计
    SELECT json_build_object(
        'total_drivers', COUNT(DISTINCT driver_id),
        'total_tasks', COUNT(*),
        'completed_tasks', SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END),
        'active_drivers', COUNT(DISTINCT CASE WHEN status IN ('PENDING', 'IN_PROGRESS') THEN driver_id END)
    ) INTO v_driver_stats
    FROM delivery_tasks
    WHERE DATE(created_at) = p_report_date;
    
    -- 商家统计
    SELECT json_build_object(
        'total_merchants', COUNT(DISTINCT merchant_id),
        'active_merchants', COUNT(DISTINCT merchant_id),
        'total_orders', COUNT(*),
        'total_revenue', COALESCE(SUM(amount), 0)
    ) INTO v_merchant_stats
    FROM orders
    WHERE DATE(created_at) = p_report_date;
    
    -- 构建返回结果
    v_result := json_build_object(
        'success', true,
        'report_date', p_report_date,
        'order_statistics', v_order_stats,
        'payment_statistics', v_payment_stats,
        'driver_statistics', v_driver_stats,
        'merchant_statistics', v_merchant_stats,
        'generated_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

