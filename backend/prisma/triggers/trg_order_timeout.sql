-- 订单超时自动处理触发器
-- 当订单超过预计送达时间2小时后，自动创建异常记录

CREATE OR REPLACE FUNCTION trg_order_timeout()
RETURNS TRIGGER AS $$
BEGIN
    -- 检查订单是否超过预计送达时间2小时且状态为SHIPPING
    IF NEW.status = 'SHIPPING' AND NEW.estimated_time IS NOT NULL THEN
        IF NOW() > NEW.estimated_time + INTERVAL '2 hours' THEN
            -- 检查是否已存在超时异常记录
            IF NOT EXISTS (
                SELECT 1 FROM order_exceptions 
                WHERE order_id = NEW.id 
                AND exception_type = 'TIMEOUT'
                AND handle_status = 'PENDING'
            ) THEN
                -- 创建超时异常记录
                INSERT INTO order_exceptions (
                    id, order_id, exception_type, description, handle_status, created_at, updated_at
                ) VALUES (
                    gen_random_uuid()::text,
                    NEW.id,
                    'TIMEOUT',
                    '订单超过预计送达时间2小时，自动标记为超时异常',
                    'PENDING',
                    NOW(),
                    NOW()
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trg_order_timeout ON orders;
CREATE TRIGGER trg_order_timeout
    AFTER INSERT OR UPDATE OF status, estimated_time ON orders
    FOR EACH ROW
    EXECUTE FUNCTION trg_order_timeout();

