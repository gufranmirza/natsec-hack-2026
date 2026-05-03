'use client';

import { useCallback, useState } from 'react';

import { ColCopilot } from '@/components/_columns/col-copilot';
import { ColMap } from '@/components/_columns/col-map';
import { ColStatus } from '@/components/_columns/col-status';
import { ObjectDrawer } from '@/components/_layout/object-drawer';
import { OpStatusBar } from '@/components/_layout/op-status-bar';
import {
  ACTIVE_MISSION_ID,
  ENTITIES,
  EVENTS,
  MISSIONS,
  RECOMMENDATIONS,
  UNITS,
} from '@/lib/fixtures';
import type { AnyObject } from '@/types/ontology';

export function HomeView() {
  const [activeMissionId, setActiveMissionId] =
    useState<string>(ACTIVE_MISSION_ID);
  const [selected, setSelected] = useState<AnyObject | null>(ENTITIES[0]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeMission =
    MISSIONS.find((m) => m._id === activeMissionId) ?? MISSIONS[0];

  // For v1 only OP SILENT EYE has full fixture data. Switching to
  // another tab updates chrome (tab highlight, status bar Op code,
  // objective banner) but leaves the live-data columns populated
  // with the OP SILENT EYE picture. A real wiring will swap data
  // sources per tab.
  const isLiveTab = activeMissionId === ACTIVE_MISSION_ID;

  const handleSelect = useCallback((o: AnyObject) => {
    setSelected(o);
    setDrawerOpen(true);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <OpStatusBar
        missions={MISSIONS}
        activeId={activeMissionId}
        onMissionSelect={setActiveMissionId}
        missionId={activeMission._source_ref ?? activeMission._id}
        utcTime="14:23:47Z"
        missionElapsed="T+02:14:09"
        commsLatencyMs={92}
        edgeState="synced"
        sensorCount={isLiveTab ? 9 : 0}
        threatCount={
          isLiveTab
            ? ENTITIES.filter((e) => e.affiliation === 'hostile').length
            : 0
        }
        unitCount={isLiveTab ? UNITS.length : 0}
      />

      <main className="bg-border grid min-h-0 flex-1 grid-cols-1 gap-px overflow-y-auto lg:grid-cols-[300px_minmax(0,1fr)_360px] lg:grid-rows-1 lg:overflow-hidden">
        {/* LEFT — orient (status surfaces, objective at top) */}
        <div className="order-2 min-h-[390px] overflow-hidden lg:order-1 lg:min-h-0">
          <ColStatus
            objective={activeMission}
            units={isLiveTab ? UNITS : []}
            entities={isLiveTab ? ENTITIES : []}
            events={isLiveTab ? EVENTS : []}
            selectedId={selected?._id}
            onSelect={handleSelect}
          />
        </div>

        {/* CENTER — observe (map, the hero) */}
        <div className="order-1 min-h-[460px] overflow-hidden lg:order-2 lg:min-h-0">
          <ColMap
            entities={isLiveTab ? ENTITIES : []}
            units={isLiveTab ? UNITS : []}
            selectedId={selected?._id}
            onSelect={handleSelect}
          />
        </div>

        {/* RIGHT — decide + act (copilot) */}
        <div className="order-3 min-h-[560px] overflow-hidden lg:min-h-0">
          <ColCopilot
            recommendations={isLiveTab ? RECOMMENDATIONS : []}
            onSelect={handleSelect}
          />
        </div>
      </main>

      <ObjectDrawer
        open={drawerOpen}
        object={selected}
        onClose={() => setDrawerOpen(false)}
        onSelect={handleSelect}
      />
    </div>
  );
}
