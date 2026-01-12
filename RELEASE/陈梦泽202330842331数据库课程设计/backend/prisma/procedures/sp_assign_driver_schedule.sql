-- 配送员排班存储过程
-- 参数: driver_id, work_date, shift_type
-- 功能：检查配送员是否已有排班和是否可用，创建排班记录
-- 返回: 排班记录ID

CREATE OR REPLACE FUNCTION sp_assign_driver_schedule(
  p_driver_id TEXT,
  p_work_date DATE,
  p_shift_type TEXT
)
RETURNS JSON AS $$
DECLARE
  v_driver RECORD;
  v_existing_schedule RECORD;
  v_schedule_id TEXT;
  v_start_time TEXT;
  v_end_time TEXT;
BEGIN
  -- 检查配送员是否存在
  SELECT * INTO v_driver
  FROM delivery_drivers
  WHERE id = p_driver_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '配送员不存在: %', p_driver_id;
  END IF;

  -- 检查配送员是否在休息状态
  IF v_driver.status = 'RESTING' THEN
    RAISE EXCEPTION '配送员当前处于休息状态，无法排班';
  END IF;

  -- 检查是否已有排班
  SELECT * INTO v_existing_schedule
  FROM driver_schedules
  WHERE driver_id = p_driver_id
    AND work_date = p_work_date
    AND shift_type = p_shift_type::shift_type;

  IF FOUND THEN
    RAISE EXCEPTION '配送员在该日期和班次已有排班记录';
  END IF;

  -- 根据班次类型设置时间
  CASE p_shift_type
    WHEN 'MORNING' THEN
      v_start_time := '08:00';
      v_end_time := '14:00';
    WHEN 'AFTERNOON' THEN
      v_start_time := '14:00';
      v_end_time := '20:00';
    WHEN 'NIGHT' THEN
      v_start_time := '20:00';
      v_end_time := '02:00';
    ELSE
      RAISE EXCEPTION '无效的班次类型: %', p_shift_type;
  END CASE;

  -- 创建排班记录
  INSERT INTO driver_schedules (
    id,
    driver_id,
    work_date,
    shift_type,
    start_time,
    end_time,
    status,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid()::text,
    p_driver_id,
    p_work_date,
    p_shift_type::shift_type,
    v_start_time,
    v_end_time,
    'SCHEDULED',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_schedule_id;

  -- 返回结果
  RETURN json_build_object(
    'schedule_id', v_schedule_id,
    'driver_id', p_driver_id,
    'work_date', p_work_date,
    'shift_type', p_shift_type,
    'start_time', v_start_time,
    'end_time', v_end_time
  );
END;
$$ LANGUAGE plpgsql;

