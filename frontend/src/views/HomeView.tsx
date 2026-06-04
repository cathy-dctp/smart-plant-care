import GreenhouseRoomMap from '../components/GreenhouseRoomMap';
import GreenhouseTaskTracker from '../components/GreenhouseTaskTracker';
import { Plant, DashboardTask } from '../types';

export interface HomeViewProps {
  plants: Plant[];
  selectedRoom: string | null;
  onSelectRoom: (room: string | null) => void;
  setActivePlantId: (id: number | null) => void;
  setActiveTab: (tab: 'home' | 'plants' | 'diagnose') => void;
  tasks: DashboardTask[];
  onWater: (plantId: number) => Promise<void>;
  onToggleSchedule: (scheduleId: number, currentCompletedStatus: boolean) => Promise<void>;
  onSnooze: (plantId: number) => Promise<void>;
  activePlantId: number | null;
}

export default function HomeView({
  plants,
  selectedRoom,
  onSelectRoom,
  setActivePlantId,
  setActiveTab,
  tasks,
  onWater,
  onToggleSchedule,
  onSnooze,
  activePlantId,
}: HomeViewProps) {
  return (
    <section className="main-portal" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Greenhouse Room Map diorama panel */}
      <GreenhouseRoomMap 
        plants={plants} 
        selectedRoom={selectedRoom} 
        onSelectRoom={onSelectRoom} 
        setActivePlantId={setActivePlantId}
        setActiveTab={setActiveTab}
      />

      {/* Greenhouse Action Center */}
      <GreenhouseTaskTracker 
        tasks={tasks}
        onWater={onWater}
        onToggleSchedule={onToggleSchedule}
        onSnooze={onSnooze}
        activePlantId={activePlantId}
        setActivePlantId={setActivePlantId}
      />
    </section>
  );
}
