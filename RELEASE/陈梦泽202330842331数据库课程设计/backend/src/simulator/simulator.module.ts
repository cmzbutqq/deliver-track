import { Module } from '@nestjs/common';
import { SimulatorService } from './simulator.service';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [TrackingModule],
  providers: [SimulatorService],
  exports: [SimulatorService],
})
export class SimulatorModule {}
