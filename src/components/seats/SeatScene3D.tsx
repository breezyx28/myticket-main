import { Suspense, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import type { SeatRecord } from '@/types/seating';
import { getSeatStatusColor, isSeatSelectable } from '@/lib/seating';
import { blueprintSectionLabel, buildBlueprintLayout } from '@/components/seats/blueprintLayout';
import { MOUSE, type Camera } from 'three';

interface SeatScene3DProps {
  seats: SeatRecord[];
  selectedSeatIds: string[];
  onToggleSeat: (seat: SeatRecord) => void;
  onSelectSectionSeats: (seatIds: string[]) => void;
}

function SeatMarker({
  seat,
  sectionId,
  selected,
  hovered,
  onHover,
  onLeave,
  onToggleSeat,
}: {
  seat: SeatRecord;
  sectionId: string;
  selected: boolean;
  hovered: boolean;
  onHover: (seatId: string, sectionId: string) => void;
  onLeave: () => void;
  onToggleSeat: (seat: SeatRecord) => void;
}) {
  const selectable = isSeatSelectable(seat);
  const seatColor = getSeatStatusColor(seat.status, selected);
  return (
    <group
      position={[seat.position.x, seat.position.y, seat.position.z]}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(seat.id, sectionId);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onLeave();
      }}
      onClick={(event) => {
        event.stopPropagation();
        if (!selectable) return;
        onToggleSeat(seat);
      }}
      scale={selected ? 1.24 : hovered ? 1.12 : 1}
    >
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.42, 0.16, 0.38]} />
        <meshBasicMaterial color={seatColor} />
      </mesh>
      <mesh position={[0, 0.24, -0.13]}>
        <boxGeometry args={[0.42, 0.28, 0.1]} />
        <meshBasicMaterial color={seatColor} />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.43, 0.165, 0.39]} />
        <meshBasicMaterial color="#0f172a" wireframe />
      </mesh>
    </group>
  );
}

function SectionBlock({
  x,
  y,
  z,
  width,
  depth,
  hovered,
  label,
  onHover,
  onLeave,
  onSelectAll,
  selectableCount,
}: {
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  hovered: boolean;
  label: string;
  onHover: () => void;
  onLeave: () => void;
  onSelectAll: () => void;
  selectableCount: number;
}) {
  return (
    <group position={[x, y, z]}>
      <mesh
        onPointerOver={(event) => {
          event.stopPropagation();
          onHover();
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          onLeave();
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (selectableCount > 0) {
            onSelectAll();
          }
        }}
      >
        <boxGeometry args={[width, 0.12, depth]} />
        <meshBasicMaterial color={hovered ? '#D5EBFF' : '#ECF4FF'} />
      </mesh>
      <mesh>
        <boxGeometry args={[width + 0.03, 0.125, depth + 0.03]} />
        <meshBasicMaterial color="#9AB6D7" wireframe />
      </mesh>
      <Text
        position={[0, 0.19, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.35}
        color="#475569"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
}

function StageAndBalcony() {
  const { t } = useTranslation('seats');

  return (
    <group>
      <group position={[0, 0.16, 8.9]}>
        <mesh>
          <boxGeometry args={[24, 0.2, 2.2]} />
          <meshBasicMaterial color="#D8DDE6" />
        </mesh>
        <Text
          position={[0, 0.23, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.7}
          color="#374151"
          anchorX="center"
          anchorY="middle"
        >
          {t('stage').toUpperCase()}
        </Text>
      </group>
      <group position={[0, 1.2, -10.2]}>
        <mesh>
          <boxGeometry args={[25, 0.16, 5.6]} />
          <meshBasicMaterial color="#E4E7EF" />
        </mesh>
        <Text
          position={[0, 0.2, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.5}
          color="#4B5563"
          anchorX="center"
          anchorY="middle"
        >
          {t('balcony').toUpperCase()}
        </Text>
      </group>
    </group>
  );
}

function GroundPlane() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[34, 30]} />
        <meshBasicMaterial color="#F8FAFD" />
      </mesh>
      <gridHelper args={[32, 32, '#D2DCEA', '#E8EEF7']} position={[0, 0.01, 0]} />
    </group>
  );
}

export function SeatScene3D({ seats, selectedSeatIds, onToggleSeat, onSelectSectionSeats }: SeatScene3DProps) {
  const { t } = useTranslation('seats');
  const [hoveredSeatId, setHoveredSeatId] = useState<string | null>(null);
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
  const controlsRef = useRef<any>(null);
  const cameraRef = useRef<Camera | null>(null);
  const layout = useMemo(() => buildBlueprintLayout(seats), [seats]);
  const seatById = useMemo(() => new Map(seats.map((seat) => [seat.id, seat])), [seats]);
  const hoveredSeat = hoveredSeatId ? seatById.get(hoveredSeatId) ?? null : null;
  const hoveredSection = hoveredSectionId
    ? layout.sections.find((section) => section.id === hoveredSectionId) ?? null
    : null;

  const sectionStats = useMemo(() => {
    if (!hoveredSection) return null;
    const sectionSeats = hoveredSection.seatIds
      .map((seatId) => seatById.get(seatId))
      .filter((seat): seat is SeatRecord => Boolean(seat));
    return {
      total: sectionSeats.length,
      available: sectionSeats.filter((seat) => seat.status === 'available').length,
      held: sectionSeats.filter((seat) => seat.status === 'held').length,
      booked: sectionSeats.filter((seat) => seat.status === 'booked').length,
    };
  }, [hoveredSection, seatById]);

  function applyViewPreset() {
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    if (!controls || !camera || !('position' in camera)) return;

    controls.target.set(0, 0.2, -1);
    camera.position.set(0, 22, 0.01);
    controls.update();
  }

  function sectionLabel(sectionId: string, fallback: string) {
    return blueprintSectionLabel(t, sectionId, fallback);
  }

  function seatStatusLabel(status: SeatRecord['status']) {
    if (status === 'available' || status === 'held' || status === 'booked') {
      return t(status);
    }
    return status;
  }

  return (
    <div className="relative h-[460px] w-full overflow-hidden rounded-2xl border border-ink-10 bg-white">
      <Canvas
        camera={{ position: [0, 30, 0.01], fov: 37 }}
        onCreated={({ camera }) => {
          cameraRef.current = camera;
          requestAnimationFrame(() => applyViewPreset());
        }}
        onPointerMissed={() => {
          setHoveredSeatId(null);
          setHoveredSectionId(null);
        }}
      >
        <Suspense fallback={null}>
          <group>
            <GroundPlane />
            <StageAndBalcony />

            {layout.sections.map((section) => (
              <SectionBlock
                key={section.id}
                x={section.centerX}
                y={section.tier === 'balcony' ? 0.8 : 0.24}
                z={section.centerZ}
                width={section.width}
                depth={section.depth}
                label={sectionLabel(section.id, section.label)}
                hovered={hoveredSectionId === section.id}
                onHover={() => setHoveredSectionId(section.id)}
                onLeave={() => {
                  if (!hoveredSeatId) setHoveredSectionId(null);
                }}
                onSelectAll={() => onSelectSectionSeats(section.availableSeatIds)}
                selectableCount={section.availableSeatIds.length}
              />
            ))}

            {layout.seats.map((placement) => (
              <SeatMarker
                key={placement.seat.id}
                seat={{ ...placement.seat, position: { x: placement.x, y: placement.y, z: placement.z } }}
                sectionId={placement.sectionId}
                selected={selectedSeatIds.includes(placement.seat.id)}
                hovered={hoveredSeatId === placement.seat.id}
                onHover={(seatId, sectionId) => {
                  setHoveredSeatId(seatId);
                  setHoveredSectionId(sectionId);
                }}
                onLeave={() => setHoveredSeatId(null)}
                onToggleSeat={onToggleSeat}
              />
            ))}
          </group>
          <OrbitControls
            ref={controlsRef}
            target={[0, 0.2, -1]}
            enablePan
            enableRotate={false}
            enableZoom
            minDistance={9}
            maxDistance={45}
            zoomSpeed={1}
            rotateSpeed={0}
            panSpeed={0.75}
            screenSpacePanning
            mouseButtons={{
              LEFT: MOUSE.PAN,
              MIDDLE: MOUSE.DOLLY,
              RIGHT: MOUSE.PAN,
            }}
          />
        </Suspense>
      </Canvas>
      <div className="absolute bottom-3 left-3 rounded-full border border-ink-10 bg-white px-3 py-1.5 text-[11px] font-semibold text-ink shadow-sm">
        {t('controlsHint')}
      </div>
      <div className="pointer-events-none absolute right-3 top-3 min-h-[72px] w-[250px] rounded-lg border border-ink-10 bg-white/95 p-3 text-[12px] shadow-sm">
        {hoveredSeat ? (
          <>
            <p className="font-bold text-ink">{t('seatLabel', { label: hoveredSeat.label })}</p>
            <p className="mt-1 text-ink-60">
              {t('sectionLabel', {
                label:
                  (hoveredSection && sectionLabel(hoveredSection.id, hoveredSection.label)) ??
                  hoveredSeat.section,
              })}
            </p>
            <p className="mt-1 text-ink-60">
              {t('rowSeat', { row: hoveredSeat.row, seat: hoveredSeat.number })}
            </p>
            <p className="mt-1 text-ink-60">
              {t('columnLabel', {
                col: layout.seats.find((item) => item.seat.id === hoveredSeat.id)?.column ?? hoveredSeat.number,
              })}
            </p>
            <p className="mt-1 text-ink-60">{t('stateLabel', { status: seatStatusLabel(hoveredSeat.status) })}</p>
          </>
        ) : hoveredSection && sectionStats ? (
          <>
            <p className="font-bold text-ink">{sectionLabel(hoveredSection.id, hoveredSection.label)}</p>
            <p className="mt-1 text-ink-60">{t('seatsInSection', { count: sectionStats.total })}</p>
            <p className="mt-1 text-ink-60">
              {t('sectionStats', {
                available: sectionStats.available,
                held: sectionStats.held,
                booked: sectionStats.booked,
              })}
            </p>
            <p className="mt-1 font-semibold text-ink">{t('selectSection')}</p>
          </>
        ) : (
          <>
            <p className="font-bold text-ink">{t('blueprintMap')}</p>
            <p className="mt-1 text-ink-60">{t('hoverHint')}</p>
          </>
        )}
      </div>
    </div>
  );
}
