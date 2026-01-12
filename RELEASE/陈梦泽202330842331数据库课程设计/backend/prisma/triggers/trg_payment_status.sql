-- 支付状态变更自动更新订单状态触发器
-- 当支付状态变为SUCCESS时，自动更新订单状态为PENDING（待发货）

CREATE OR REPLACE FUNCTION trg_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- 当支付成功时，如果订单状态还是PENDING，保持PENDING（待发货）
    -- 如果订单状态是CANCELLED，则恢复为PENDING
    IF NEW.status = 'SUCCESS' AND (OLD.status IS NULL OR OLD.status != 'SUCCESS') THEN
        UPDATE orders
        SET status = 'PENDING',
            updated_at = NOW()
        WHERE id = NEW.order_id
        AND (status = 'PENDING' OR status = 'CANCELLED');
    END IF;
    
    -- 当支付失败时，如果订单状态是PENDING，可以保持或标记为需要重新支付
    IF NEW.status = 'FAILED' AND (OLD.status IS NULL OR OLD.status != 'FAILED') THEN
        -- 这里可以根据业务需求决定是否更新订单状态
        -- 暂时不更新，保持订单状态不变
        NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trg_payment_status ON payments;
CREATE TRIGGER trg_payment_status
    AFTER INSERT OR UPDATE OF status ON payments
    FOR EACH ROW
    EXECUTE FUNCTION trg_payment_status();

