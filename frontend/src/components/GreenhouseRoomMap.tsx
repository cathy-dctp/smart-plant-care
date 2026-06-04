import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, ShieldAlert, Droplet, Thermometer, Sun } from 'lucide-react';
import { Plant } from '../types';

import monsteraPixel from '../assets/monstera_pixel.png';
import succulentPixel from '../assets/succulent_pixel.png';
import fernPixel from '../assets/fern_pixel.png';
import cactusPixel from '../assets/cactus_pixel.png';

export interface GreenhouseRoomMapProps {
  plants: Plant[];
  selectedRoom: string | null;
  onSelectRoom: (room: string | null) => void;
  setActivePlantId?: (id: number | null) => void;
  setActiveTab?: (tab: string) => void;
}

interface RoomConfig {
  id: string;
  name: string;
  emoji: string;
  row: number;
  col: number;
  floorColor1: string; // Tiling light shade
  floorColor2: string; // Tiling dark shade
}



export default function GreenhouseRoomMap({ 
  plants, 
  selectedRoom, 
  onSelectRoom,
  setActivePlantId,
  setActiveTab
}: GreenhouseRoomMapProps) {
  
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [hoveredPlant, setHoveredPlant] = useState<Plant | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 2. Room definitions mapped to a 2x2 grid representing the apartment floorplan
  const rooms: RoomConfig[] = [
    { 
      id: 'Bedroom', 
      name: 'Bedroom', 
      emoji: '🛏️', 
      row: 0, 
      col: 0, 
      floorColor1: '#8B5A2B', // Cozy sienna wood light
      floorColor2: '#704214'  // Cozy sienna wood dark
    },
    { 
      id: 'Living Room', 
      name: 'Living Room', 
      emoji: '🛋️', 
      row: 0, 
      col: 1, 
      floorColor1: '#0d9488', // Emerald/Teal carpet light
      floorColor2: '#0f766e'  // Emerald/Teal carpet dark
    },
    { 
      id: 'Bathroom', 
      name: 'Bathroom', 
      emoji: '🛁', 
      row: 1, 
      col: 0, 
      floorColor1: '#eff6ff', // Aqua blue ice tiles light
      floorColor2: '#bfdbfe'  // Aqua blue ice tiles dark
    },
    { 
      id: 'Office', 
      name: 'Office', 
      emoji: '💻', 
      row: 1, 
      col: 1, 
      floorColor1: '#374151', // Tech dark-grey light
      floorColor2: '#1f2937'  // Tech dark-grey dark
    }
  ];

  // 3. Coordinate conversion: Isometric projections (2:1 aspect ratio) scaled up by 50%
  const tileWidth = 240;
  const tileHeight = 120;
  const centerX = 350;
  const centerY = 150;

  const getIsoCoords = (row: number, col: number) => {
    const x = (col - row) * (tileWidth / 2) + centerX;
    const y = (col + row) * (tileHeight / 2) + centerY;
    return { x, y };
  };

  // 4. Retrieve exact sub-tile centers for the 4 corners of the 4x4 floor grid (perfectly aligned with tiles)
  const getPlantSubTileCoords = (index: number, rx: number, ry: number) => {
    const corners = [
      { i: 2, j: 0 },   // 1. Back-Left Corner Tile (inset slightly to not overlap room boundary)
      { i: 0, j: 2 },   // 2. Back-Right Corner Tile
      { i: 1, j: 1 },   // 3. Far-Back Corner Tile
      { i: 2, j: 2 }    // 4. Front Corner Tile
    ];
    const subW = tileWidth / 4;  // 60px
    const subH = tileHeight / 4; // 30px
    
    // Choose the corner tile configuration
    const config = corners[index % corners.length];
    
    // Calculate the absolute center of this sub-tile in screen pixels
    const rTopX = rx;
    const rTopY = ry - tileHeight / 2;
    
    const sx = rTopX + (config.j - config.i) * (subW / 2);
    const sy = rTopY + (config.j + config.i) * (subH / 2) + (subH / 2);
    
    return { sx, sy };
  };

  // Aggregate statistics dynamically for each room
  const getRoomStats = (roomName: string) => {
    const roomPlants = plants.filter(p => 
      p.location && p.location.toLowerCase().trim() === roomName.toLowerCase().trim()
    );

    const totalPlants = roomPlants.length;

    const moistures = roomPlants
      .map(p => p.latest_moisture)
      .filter((m): m is number => m !== null && m !== undefined);
    
    const avgMoisture = moistures.length > 0
      ? Math.round(moistures.reduce((sum, val) => sum + val, 0) / moistures.length)
      : null;

    const temps = roomPlants
      .map(p => p.latest_temperature)
      .filter((t): t is number => t !== null && t !== undefined);
    
    const avgTemp = temps.length > 0
      ? parseFloat((temps.reduce((sum, val) => sum + val, 0) / temps.length).toFixed(1))
      : null;

    const dryAlertCount = roomPlants.filter(p => 
      p.latest_moisture !== null && p.latest_moisture !== undefined && p.latest_moisture < 40.0
    ).length;

    return { totalPlants, avgMoisture, avgTemp, dryAlertCount, roomPlants };
  };

  // Custom Inline SVG Renderer for beautifully scaled pixel-art plants
  const renderPixelPlantSvg = (species: string) => {
    const lowerSpecies = species.toLowerCase();
    let imageSrc = fernPixel; // Default fallback

    if (lowerSpecies.includes('monstera') || lowerSpecies.includes('rubber') || lowerSpecies.includes('fig')) {
      imageSrc = monsteraPixel;
    } else if (lowerSpecies.includes('succulent')) {
      imageSrc = succulentPixel;
    } else if (lowerSpecies.includes('cactus')) {
      imageSrc = cactusPixel;
    } else if (lowerSpecies.includes('fern')) {
      imageSrc = fernPixel;
    }

    return (
      <g style={{ transformOrigin: 'bottom center' }} className="retro-plant-anim">
        <image 
          href={imageSrc}
          x="-20"
          y="-34"
          width="40"
          height="40"
          style={{ imageRendering: 'pixelated' }}
        />
      </g>
    );
  };

  const handlePlantClick = (plant: Plant) => {
    if (setActivePlantId && setActiveTab) {
      setActivePlantId(plant.id);
      setActiveTab('plants'); // Route user directly to My Plants tab
    }
  };

  const handlePlantHover = (plant: Plant | null, e?: React.MouseEvent) => {
    if (plant) {
      setHoveredPlant(plant);
      if (e) {
        // Calculate position relative to container
        const bounds = e.currentTarget.getBoundingClientRect();
        setTooltipPos({
          x: bounds.left + window.scrollX + 25,
          y: bounds.top + window.scrollY - 110
        });
      }
    } else {
      setHoveredPlant(null);
    }
  };

  const handleRoomClick = (roomId: string) => {
    onSelectRoom(selectedRoom === roomId ? null : roomId);
  };

  return (
    <div 
      className="nes-container is-rounded retro-map-card" 
      style={{ 
        padding: '24px 16px',
        backgroundColor: '#111827', // Unified retro CRT dark background!
        border: '4px solid #000',
        display: 'flex', 
        flexDirection: 'column', 
        gap: '20px',
        position: 'relative',
        boxShadow: 'inset 0 0 24px rgba(0,0,0,0.7), 0 10px 30px rgba(0,0,0,0.08)' // CRT screen deep shadow!
      }}
    >
      {/* 8-Bit Header Dashboard Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', zIndex: 10 }}>
        <h2 className="nes-font" style={{ fontSize: '13px', margin: 0, color: '#10b981', textShadow: '0 0 4px rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>👾</span> APARTMENT DIORAMA MAP
        </h2>
        
        {selectedRoom && (
          <button
            onClick={() => { onSelectRoom(null); }}
            className="nes-btn is-error nes-font"
            style={{ fontSize: '7.5px', padding: '4px 8px' }}
          >
            RESET ROOM FILTER [B]
          </button>
        )}
      </div>

      {/* Map Viewport Area - expanded edge-to-edge */}
      <div 
        style={{ 
          width: '100%', 
          position: 'relative',
          overflow: 'visible'
        }}
      >
        <svg 
          viewBox="0 0 700 370" 
          style={{ 
            display: 'block', 
            overflow: 'visible',
            height: '350px', // Constrained height!
            width: 'auto',   // Scale width proportionally!
            margin: '0 auto' // Center it inside the full-width card!
          }}
        >
          {/* SVG Definitions for global styles */}
          <defs>
            {/* Swaying plant micro-animation */}
            <style>{`
              @keyframes retro-sway {
                0%, 100% { transform: scaleY(1) rotate(0deg); }
                50% { transform: scaleY(1.04) rotate(0.8deg) skewX(0.5deg); }
              }
              .retro-plant-anim {
                animation: retro-sway 3.2s infinite ease-in-out;
                transform-origin: bottom center;
              }
            `}</style>
            
            {/* Beautiful morning sun sky linear gradient for the retro windows */}
            <linearGradient id="retro-window-sky" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="65%" stopColor="#7dd3fc" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
          </defs>

          {/* BACK WALL DIORAMA SHADING */}
          {/* Back-Left Wall (Bedroom Boundary) */}
          <polygon 
            points={`${centerX - 240},${centerY + 60 - 70} ${centerX},${centerY - 60 - 70} ${centerX},${centerY - 60} ${centerX - 240},${centerY + 60}`} 
            fill="#1e293b" 
            stroke="#000" 
            strokeWidth="3" 
            opacity="0.9"
          />
          {/* Back-Right Wall (Living Room Boundary) */}
          <polygon 
            points={`${centerX},${centerY - 60 - 70} ${centerX + 240},${centerY + 60 - 70} ${centerX + 240},${centerY + 60} ${centerX},${centerY - 60}`} 
            fill="#0f172a" 
            stroke="#000" 
            strokeWidth="3" 
            opacity="0.9"
          />

          {/* 👾 RETRO ARCADE WINDOWS DIORAMA (ON BACK-RIGHT WALL) 👾 */}
          {/* 1. Bedroom Window (Left half of Back-Right Wall) - 1.5x Scale */}
          <g style={{ imageRendering: 'pixelated' }}>
            {/* Window Glass Pane with thick black frame */}
            <polygon 
              points="380,43 440,73 440,125 380,95" 
              fill="url(#retro-window-sky)" 
              stroke="#000" 
              strokeWidth="3" 
            />
            {/* Slanted Glass Pane Shines */}
            <line x1="388" y1="65" x2="418" y2="95" stroke="#fff" strokeWidth="2.5" opacity="0.45" strokeLinecap="square" />
            <line x1="410" y1="62" x2="432" y2="84" stroke="#fff" strokeWidth="2.5" opacity="0.45" strokeLinecap="square" />
            
            {/* Window Pane Grid Lines (Cross frame) */}
            <line x1="410" y1="58" x2="410" y2="110" stroke="#000" strokeWidth="2.5" />
            <line x1="380" y1="69" x2="440" y2="99" stroke="#000" strokeWidth="2.5" />
          </g>

          {/* 2. Living Room Window (Right half of Back-Right Wall) - 1.5x Scale */}
          <g style={{ imageRendering: 'pixelated' }}>
            {/* Window Glass Pane with thick black frame */}
            <polygon 
              points="500,103 560,133 560,185 500,155" 
              fill="url(#retro-window-sky)" 
              stroke="#000" 
              strokeWidth="3" 
            />
            {/* Slanted Glass Pane Shines */}
            <line x1="508" y1="125" x2="538" y2="155" stroke="#fff" strokeWidth="2.5" opacity="0.45" strokeLinecap="square" />
            <line x1="530" y1="122" x2="552" y2="144" stroke="#fff" strokeWidth="2.5" opacity="0.45" strokeLinecap="square" />
            
            {/* Window Pane Grid Lines (Cross frame) */}
            <line x1="530" y1="118" x2="530" y2="170" stroke="#000" strokeWidth="2.5" />
            <line x1="500" y1="129" x2="560" y2="159" stroke="#000" strokeWidth="2.5" />
          </g>

          {/* Draw Floor Tiles programmatically for each room */}
          {rooms.map((room) => {
            const isSelected = selectedRoom === room.id;
            const isHovered = hoveredRoom === room.id;
            const { x: rx, y: ry } = getIsoCoords(room.row, room.col);
            const { totalPlants, dryAlertCount, roomPlants } = getRoomStats(room.name);
            const hasDry = dryAlertCount > 0;

            return (
              <g 
                key={room.id}
                onMouseEnter={() => setHoveredRoom(room.id)}
                onMouseLeave={() => setHoveredRoom(null)}
                onClick={() => handleRoomClick(room.id)}
                style={{ cursor: 'pointer' }}
              >
                {/* 4x4 PROGRAMMATIC ISO CHECKERBOARD TILES */}
                {Array.from({ length: 4 }).map((_, i) =>
                  Array.from({ length: 4 }).map((_, j) => {
                    const subW = tileWidth / 4;
                    const subH = tileHeight / 4;
                    // Compute top corner of this specific room grid
                    const rTopX = rx;
                    const rTopY = ry - tileHeight / 2;
                    
                    // Center point of the sub-tile
                    const sx = rTopX + (j - i) * (subW / 2);
                    const sy = rTopY + (j + i) * (subH / 2) + (subH / 2);

                    // Alternating checkerboard color shade selector
                    const color = (i + j) % 2 === 0 ? room.floorColor1 : room.floorColor2;

                    return (
                      <polygon
                        key={`${i}-${j}`}
                        points={`
                          ${sx},${sy - subH / 2} 
                          ${sx + subW / 2},${sy} 
                          ${sx},${sy + subH / 2} 
                          ${sx - subW / 2},${sy}
                        `}
                        fill={color}
                        stroke="#000"
                        strokeWidth="0.5"
                        opacity={isHovered || isSelected ? 0.95 : 0.7}
                        style={{
                          transition: 'opacity 0.2s',
                          filter: isSelected ? 'brightness(1.2) saturate(1.1)' : 'none'
                        }}
                      />
                    );
                  })
                )}

                {/* HIGHLIGHT FLOATING ROOM BORDERS ON HOVER / SELECTION */}
                <polygon
                  points={`
                    ${rx},${ry - tileHeight / 2} 
                    ${rx + tileWidth / 2},${ry} 
                    ${rx},${ry + tileHeight / 2} 
                    ${rx - tileWidth / 2},${ry}
                  `}
                  fill="none"
                  stroke={isSelected ? '#10b981' : isHovered ? '#fbbf24' : hasDry ? '#ef4444' : '#000000'}
                  strokeWidth={isSelected ? '4' : isHovered ? '3' : '2'}
                  style={{ transition: 'stroke 0.25s, stroke-width 0.25s' }}
                />

                {/* 8-BIT ROOM LABELS */}
                <g style={{ pointerEvents: 'none' }}>
                  <rect 
                    x={rx - 45} 
                    y={ry - 5} 
                    width="90" 
                    height="12" 
                    fill="rgba(0, 0, 0, 0.75)" 
                    stroke="#000" 
                    strokeWidth="1.5" 
                    rx="1"
                  />
                  <text
                    x={rx}
                    y={ry + 4.5}
                    textAnchor="middle"
                    fill={isSelected ? '#34d399' : '#fff'}
                    fontSize="5px"
                    className="nes-font"
                  >
                    {room.emoji} {room.name.toUpperCase()}
                  </text>
                </g>

                {/* DYNAMIC RETRO PLANTS PLACED IN SCATTERED COORDINATES */}
                {roomPlants.map((plant, pIdx) => {
                  const { sx: pX, sy: pY } = getPlantSubTileCoords(pIdx, rx, ry);

                  return (
                    <g
                      key={plant.id}
                      transform={`translate(${pX}, ${pY})`}
                      onClick={(e) => {
                        e.stopPropagation(); // Stop room clicking
                        handlePlantClick(plant);
                      }}
                      onMouseEnter={(e) => handlePlantHover(plant, e)}
                      onMouseLeave={() => handlePlantHover(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Gentle hover shadow ring under plant pot */}
                      <ellipse cx="0" cy="0" rx="12" ry="5.5" fill="rgba(0,0,0,0.25)" />

                      {/* Scalable custom vector pixel-art plant */}
                      {renderPixelPlantSvg(plant.species)}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Aggregate Floating Room Environmental Stats HUD */}
        {hoveredRoom && (
          <div 
            className="nes-container is-rounded is-dark nes-font"
            style={{ 
              position: 'absolute', 
              bottom: '12px', 
              left: '12px', 
              padding: '8px 12px', 
              fontSize: '6.5px',
              maxWidth: '220px',
              borderImageSlice: '2',
              pointerEvents: 'none',
              backgroundColor: 'rgba(15,23,42,0.92)'
            }}
          >
            <div style={{ color: '#fbbf24', marginBottom: '4px', fontWeight: 'bold' }}>
              📍 {hoveredRoom.toUpperCase()} FEEDS
            </div>
            {(() => {
              const { totalPlants, avgMoisture, avgTemp, dryAlertCount } = getRoomStats(hoveredRoom);
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div>Plants Registered: {totalPlants}</div>
                  {totalPlants > 0 ? (
                    <>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        🌡️ Climate Temp: {avgTemp !== null ? `${avgTemp}°C` : 'N/A'}
                      </div>
                      {dryAlertCount > 0 && (
                        <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 'bold' }}>
                          ⚠️ Thirsty Hazards: {dryAlertCount} DRY!
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ color: '#8ba598', fontStyle: 'italic' }}>No active IoT telemetry.</div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Aggregate footprint summary */}
      <div 
        className="nes-font"
        style={{ 
          marginTop: '4px', 
          padding: '10px 12px', 
          backgroundColor: '#1b221e', 
          border: '4px solid #000',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '7px',
          color: '#8ba598'
        }}
      >
        <span style={{ color: '#10b981', fontSize: '12px' }}>💡</span>
        <span>
          {selectedRoom 
            ? `FILTER: SHOWING ONLY ${selectedRoom.toUpperCase()} PLANTS. CLICK ROOM AGAIN TO CLEAR.` 
            : `APT SYSTEM SYNCED: ${plants.length} SMART REGISTERED INDOOR FLORA. HOVER/CLICK FOR CONSOLE DATA.`
          }
        </span>
      </div>

      {/* 8-BIT FLOAT TOOLTIP BALOON ON HOVER PLANT */}
      <AnimatePresence>
        {hoveredPlant && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="retro-tooltip nes-container is-rounded"
            style={{
              position: 'absolute',
              left: tooltipPos.x,
              top: tooltipPos.y,
              width: '180px',
              padding: '10px',
              backgroundColor: '#fff',
              borderImageSlice: '2',
              zIndex: 999
            }}
            onMouseEnter={() => setHoveredPlant(hoveredPlant)}
            onMouseLeave={() => setHoveredPlant(null)}
          >
            <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#000', marginBottom: '2px', textTransform: 'uppercase' }}>
              🪴 {hoveredPlant.name}
            </div>
            <div style={{ fontSize: '5.5px', color: '#647b70', fontStyle: 'italic', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {hoveredPlant.species}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '8px' }}>
              {/* Moisture level with custom NES-like progress bar */}
              <div>
                <div style={{ fontSize: '5px', color: '#000', marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>💧 MOISTURE</span>
                  <span>{hoveredPlant.latest_moisture !== null ? `${hoveredPlant.latest_moisture}%` : 'N/A'}</span>
                </div>
                <progress 
                  className={`nes-progress ${
                    hoveredPlant.latest_moisture !== null && hoveredPlant.latest_moisture < 40 
                      ? 'is-error' 
                      : hoveredPlant.latest_moisture !== null && hoveredPlant.latest_moisture < 45 
                        ? 'is-warning' 
                        : 'is-success'
                  }`} 
                  value={hoveredPlant.latest_moisture || 0} 
                  max="100" 
                  style={{ height: '8px', display: 'block' }}
                />
              </div>

              {/* Climate readout grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '5px', color: '#000' }}>
                <div>🌡️ {hoveredPlant.latest_temperature !== null ? `${hoveredPlant.latest_temperature}°C` : 'N/A'}</div>
                <div>☀️ {hoveredPlant.latest_light_level !== null ? `${hoveredPlant.latest_light_level} lx` : 'N/A'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <button 
                onClick={() => handlePlantClick(hoveredPlant)}
                className="nes-btn is-success nes-font"
                style={{ fontSize: '5px', padding: '2px 4px', width: '100%' }}
              >
                CARE PORTAL [A]
              </button>
              <button 
                onClick={() => {
                  if (setActivePlantId && setActiveTab) {
                    setActivePlantId(hoveredPlant.id);
                    setActiveTab('diagnose'); // Route user to AI Doctor
                  }
                }}
                className="nes-btn is-warning nes-font"
                style={{ fontSize: '5px', padding: '2px 4px', width: '100%' }}
              >
                AI DIAGNOSE [B]
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
