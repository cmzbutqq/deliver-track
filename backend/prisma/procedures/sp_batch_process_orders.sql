-- 批量处理订单存储过程
-- 参数: order_ids (TEXT数组), new_status (TEXT), batch_size (INTEGER, 默认100)
-- 返回: JSON格式的处理结果

CREATE OR REPLACE FUNCTION sp_batch_process_orders(
    p_order_ids TEXT[],
    p_new_status TEXT,
    p_batch_size INTEGER DEFAULT 100
)
RETURNS JSON AS $$
DECLARE
    v_processed_count INTEGER := 0;
    v_failed_count INTEGER := 0;
    v_result JSON;
    v_order_id TEXT;
    v_order_record RECORD;
BEGIN
    -- 验证状态值
    IF p_new_status NOT IN ('PENDING', 'SHIPPING', 'DELIVERED', 'CANCELLED') THEN
        RAISE EXCEPTION '无效的订单状态: %', p_new_status;
    END IF;
    
    -- 限制批量处理数量
    IF array_length(p_order_ids, 1) > p_batch_size THEN
        RAISE EXCEPTION '批量处理订单数量不能超过 %', p_batch_size;
    END IF;
    
    -- 遍历订单ID数组
    FOREACH v_order_id IN ARRAY p_order_ids
    LOOP
        BEGIN
            -- 获取订单信息
            SELECT * INTO v_order_record
            FROM orders
            WHERE id = v_order_id;
            
            IF NOT FOUND THEN
                v_failed_count := v_failed_count + 1;
                CONTINUE;
            END IF;
            
            -- 更新订单状态
            UPDATE orders
            SET status = p_new_status::OrderStatus,
                updated_at = NOW()
            WHERE id = v_order_id;
            
            -- 如果新状态是DELIVERED，更新实际送达时间
            IF p_new_status = 'DELIVERED' THEN
                UPDATE orders
                SET actual_time = NOW()
                WHERE id = v_order_id AND actual_time IS NULL;
            END IF;
            
            v_processed_count := v_processed_count + 1;
            
        EXCEPTION
            WHEN OTHERS THEN
                v_failed_count := v_failed_count + 1;
        END;
    END LOOP;
    
    -- 构建返回结果
    v_result := json_build_object(
        'success', true,
        'total', array_length(p_order_ids, 1),
        'processed', v_processed_count,
        'failed', v_failed_count,
        'new_status', p_new_status
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

