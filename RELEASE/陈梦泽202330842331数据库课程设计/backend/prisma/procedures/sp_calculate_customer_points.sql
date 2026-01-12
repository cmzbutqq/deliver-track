-- 计算客户积分存储过程
-- 参数: customer_id (TEXT), start_date (DATE, 可选), end_date (DATE, 可选)
-- 返回: JSON格式的积分计算结果

CREATE OR REPLACE FUNCTION sp_calculate_customer_points(
    p_customer_id TEXT,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_total_points INTEGER := 0;
    v_used_points INTEGER := 0;
    v_available_points INTEGER := 0;
    v_order_count INTEGER := 0;
    v_total_amount DOUBLE PRECISION := 0;
    v_result JSON;
BEGIN
    -- 验证客户是否存在
    IF NOT EXISTS (SELECT 1 FROM customers WHERE id = p_customer_id) THEN
        RAISE EXCEPTION '客户不存在: %', p_customer_id;
    END IF;
    
    -- 计算指定时间段内的订单积分
    SELECT 
        COUNT(*),
        COALESCE(SUM(FLOOR(amount)), 0)
    INTO v_order_count, v_total_amount
    FROM orders
    WHERE customer_id = p_customer_id
    AND status = 'DELIVERED'
    AND (p_start_date IS NULL OR DATE(created_at) >= p_start_date)
    AND (p_end_date IS NULL OR DATE(created_at) <= p_end_date);
    
    -- 计算总积分（每1元 = 1积分）
    v_total_points := FLOOR(v_total_amount);
    
    -- 获取已使用积分
    SELECT COALESCE(used_points, 0) INTO v_used_points
    FROM customer_points
    WHERE customer_id = p_customer_id;
    
    -- 计算可用积分
    v_available_points := v_total_points - v_used_points;
    IF v_available_points < 0 THEN
        v_available_points := 0;
    END IF;
    
    -- 更新或插入客户积分记录
    INSERT INTO customer_points (
        id, customer_id, total_points, used_points, available_points, created_at, updated_at
    ) VALUES (
        gen_random_uuid()::text,
        p_customer_id,
        v_total_points,
        v_used_points,
        v_available_points,
        NOW(),
        NOW()
    )
    ON CONFLICT (customer_id) DO UPDATE SET
        total_points = v_total_points,
        available_points = v_available_points,
        updated_at = NOW();
    
    -- 构建返回结果
    v_result := json_build_object(
        'success', true,
        'customer_id', p_customer_id,
        'total_points', v_total_points,
        'used_points', v_used_points,
        'available_points', v_available_points,
        'order_count', v_order_count,
        'total_amount', v_total_amount,
        'start_date', p_start_date,
        'end_date', p_end_date
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

