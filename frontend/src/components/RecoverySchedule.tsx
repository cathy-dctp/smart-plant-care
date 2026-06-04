import { useState } from 'react';
import { Calendar, ClipboardList, Droplet, FlaskConical, Scissors, Info, Check, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plant, PlantDetail } from '../types';

export interface RecoveryScheduleProps {
  plantDetail: PlantDetail | null;
  activePlant: Plant;
  handleToggleSchedule: (id: number, isCompleted: boolean) => void;
  handleWater?: () => Promise<void>;
  handleLogFertilizer?: () => Promise<void>;
}

// 1. Dynamic Fertilizer & Nutrition Recommendation Generator
interface FertilizerRec {
  fertilizerName: string;
  schedule: string;
  instructions: string;
  tips: string[];
}

export function getFertilizerRecommendation(plant: Plant): FertilizerRec {
  const species = (plant.species || '').toLowerCase();
  const pottingMix = (plant.potting_mix || '').toLowerCase();
  const light = (plant.light_condition || '').toLowerCase();
  const maturity = (plant.maturity_stage || '').toLowerCase();

  let fertilizerName = "All-Purpose Balanced Houseplant Fertilizer (10-10-10)";
  let schedule = "Every 30 days during Spring and Summer";
  let instructions = "Dilute liquid plant food to half-strength and apply to damp soil.";
  let tips = [
    "Always water the soil thoroughly before fertilizing to prevent root burn.",
    "Suspend all fertilization during the dark winter dormancy period."
  ];

  // Species-based rules
  if (species.includes('succulent') || species.includes('cactus') || species.includes('aloe') || species.includes('jade') || species.includes('haworthia') || species.includes('sansevieria') || species.includes('snake')) {
    fertilizerName = "Low-Nitrogen Cacti & Succulent Fertilizer (2-7-7)";
    schedule = "Every 45 days in Spring and Summer";
    instructions = "Dilute to 25% recommended strength. Apply only to moist soil.";
    tips.push("Succulents are light feeders; over-fertilizing causes weak, elongated growth.");
  } else if (species.includes('fern') || species.includes('calathea') || species.includes('maranta') || species.includes('prayer') || species.includes('stromanthe')) {
    fertilizerName = "Diluted Organic Balanced Fertilizer (5-5-5)";
    schedule = "Every 30 days during active growth";
    instructions = "Dilute to 25% strength. Calatheas are highly sensitive to mineral build-up.";
    tips.push("Flush the substrate with pure distilled water once a month to wash away salts.");
  } else if (species.includes('orchid')) {
    fertilizerName = "Specialty Orchid Urea-Free Food (20-20-20)";
    schedule = "Every 14 days in growing season ('weakly, weekly')";
    instructions = "Mist roots and bark with a highly diluted quarter-strength solution.";
    tips.push("Never fertilize dry roots. Submerge orchid bark in plain water first.");
  } else if (species.includes('monstera') || species.includes('ficus') || species.includes('fig') || species.includes('rubber') || species.includes('pothos') || species.includes('philodendron')) {
    fertilizerName = "Nitrogen-Rich Foliage Plant Food (3-1-2)";
    schedule = "Every 14-20 days during Spring and Summer";
    instructions = "Dilute to 50% strength. Apply during regular watering cycles.";
    tips.push("Nitrogen supports rapid stem growth and development of large, split leaves.");
  }

  // Sunlight modifiers
  if (light.includes('shade') || light.includes('low') || light.includes('indirect sun')) {
    if (light.includes('full shade') || light.includes('low light')) {
      schedule = "Every 60 days (Suspended in Winter)";
      instructions += " Use a highly diluted (quarter-strength) blend.";
      tips.push("Low light limits photosynthesis, meaning the plant has minimal metabolic nutrient draw.");
    }
  }

  // Potting substrate modifiers
  if (pottingMix.includes('compost') || pottingMix.includes('nursery') || pottingMix.includes('slow release')) {
    tips.push("⚠️ Substrate has slow-release nutrients. Hold off liquid fertilizing for 2 months after repotting.");
  } else if (pottingMix.includes('soilless') || pottingMix.includes('peat') || pottingMix.includes('coco') || pottingMix.includes('perlite')) {
    tips.push("💡 Soilless coco-coir/peat blends are nutrient-inert. Regular liquid fertilizing is crucial.");
  }

  // Maturity modifiers
  if (maturity.includes('cutting') || maturity.includes('propagation') || maturity.includes('unrooted')) {
    fertilizerName = "Nutrition Suspended (Propagation)";
    schedule = "Do not fertilize";
    instructions = "Hold off fertilizing until root systems are potted in soil mix.";
    tips = [
      "Unrooted cuttings do not have functional root hairs to absorb salts.",
      "Adding fertilizer now will burn callouses and rot new roots.",
      "Wait 4 weeks after potting in soil before first light feeding."
    ];
  }

  return { fertilizerName, schedule, instructions, tips };
}

// 2. Dynamic Propagation & Cutting Guide Generator
interface PropagationGuide {
  method: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  bestSeason: string;
  guideSteps: string[];
}

export function getPropagationGuide(plant: Plant): PropagationGuide {
  const species = (plant.species || '').toLowerCase();
  const maturity = (plant.maturity_stage || '').toLowerCase();

  let method = "Stem Tip Cutting";
  let difficulty: 'Easy' | 'Medium' | 'Hard' = 'Easy';
  let bestSeason = "Spring to Early Summer";
  let guideSteps = [
    "Snip a healthy 4-6 inch stem tip containing 3-4 leaves using sterile shears.",
    "Remove the lower leaves, exposing at least one node (where leaves were attached).",
    "Dip the cut tip into rooting hormone powder to stimulate cells (optional).",
    "Plant in a moist, light propagation mix (equal parts perlite and peat).",
    "Place under a clear plastic dome or bag to maintain 80%+ humidity.",
    "Keep in warm, bright indirect light. Roots will develop in 3-4 weeks."
  ];

  if (species.includes('succulent') || species.includes('cactus') || species.includes('aloe') || species.includes('jade') || species.includes('haworthia') || species.includes('echeveria')) {
    method = "Leaf Pulling & Callousing";
    difficulty = 'Easy';
    bestSeason = "Late Spring / Summer";
    guideSteps = [
      "Gently twist a healthy, plump leaf from the base. It MUST be a clean break from the stem.",
      "Lay the leaf flat on a dry paper towel in a warm, shaded spot for 3-5 days to let it callous.",
      "Once calloused, lay the leaf on top of succulent soil (do not bury it).",
      "Do not water until you see tiny pink roots or a miniature pup emerge (2-3 weeks).",
      "Mist the soil lightly around the roots every few days once they appear."
    ];
  } else if (species.includes('snake') || species.includes('sansevieria')) {
    method = "Leaf Segmenting or Division";
    difficulty = 'Easy';
    bestSeason = "Spring / Summer";
    guideSteps = [
      "For Division: Carefully split the root clump into sections, ensuring each has leaves and roots.",
      "For Leaf Cuttings: Snip a healthy leaf at the base and cut it into 3-4 inch segments.",
      "Keep track of the orientation! The bottom (rootward) end must always point downwards.",
      "Let segments dry for 2 days to callous.",
      "Insert calloused end 1 inch deep into moist sand/perlite mix. Roots sprout in 6-12 weeks."
    ];
  } else if (species.includes('monstera') || species.includes('pothos') || species.includes('philodendron') || species.includes('ficus') || species.includes('ivy') || species.includes('fig')) {
    method = "Stem Node Water Propagation";
    difficulty = 'Easy';
    bestSeason = "Spring to Summer";
    guideSteps = [
      "Locate a healthy node containing at least one leaf and an aerial root bump.",
      "Snip the vine 1/2 inch below the node using sharp, sterilized shears.",
      "Submerge the node in a clean glass vase of water, keeping leaves dry.",
      "Change the water weekly to replenish oxygen levels and avoid stem rot.",
      "Once roots grow 2-3 inches long, plant in a well-draining soil mix."
    ];
  } else if (species.includes('fern') || species.includes('calathea') || species.includes('maranta') || species.includes('prayer') || species.includes('peace lily')) {
    method = "Root Crown Division";
    difficulty = 'Medium';
    bestSeason = "Early Spring (Repotting)";
    guideSteps = [
      "Water the plant well 24 hours prior to dividing to loosen root ball.",
      "Gently remove the plant from its pot and brush away excess soil.",
      "Tease apart the root clumps to find natural divisions or offsets.",
      "Use a sterilized blade to divide thick rhizomes, preserving root nets on all splits.",
      "Pot each division in fresh soil, water thoroughly, and place in high humidity."
    ];
  }

  // Maturity modifier
  if (maturity.includes('cutting') || maturity.includes('propagation')) {
    guideSteps = [
      "This plant is currently registered as a cutting or propagation!",
      "Focus on nurturing its existing roots first: keep its substrate damp (or change its water weekly).",
      "Do not attempt further cuttings until the plant has matured and grown at least 4-5 leaves in a pot.",
      "When mature, follow the standard species guide above to multiply your greenery."
    ];
  }

  return { method, difficulty, bestSeason, guideSteps };
}

export default function RecoverySchedule({ 
  plantDetail, 
  activePlant, 
  handleToggleSchedule,
  handleWater,
  handleLogFertilizer
}: RecoveryScheduleProps) {
  const [showWaterRules, setShowWaterRules] = useState<boolean>(false);
  const [fertilizingStatus, setFertilizingStatus] = useState<string | null>(null);
  const [isWatering, setIsWatering] = useState<boolean>(false);

  // Stagger variants for checklist items
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: 10 },
    show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
  };

  // Determine watering task state
  // Checked if soil moisture is healthy (>= 40.0%), Unchecked if dry (< 40.0%)
  const isHydrated = activePlant.latest_moisture !== null && activePlant.latest_moisture >= 40.0;
  
  // Resolve fertilizer recommendation & propagation guide
  const fertilizer = getFertilizerRecommendation(activePlant);
  if (activePlant.fertilizer_guideline) {
    fertilizer.fertilizerName = "Botanical Database Guideline";
    fertilizer.instructions = activePlant.fertilizer_guideline;
    fertilizer.schedule = "Apply as specified by species record";
  } else {
    fertilizer.fertilizerName = `${fertilizer.fertilizerName} (Local Rule)`;
  }

  const propagation = getPropagationGuide(activePlant);
  if (activePlant.propagation_methods) {
    propagation.method = activePlant.propagation_methods;
    propagation.guideSteps = [
      `Database Recommended Methods: ${activePlant.propagation_methods}.`,
      "1. Make a clean cut with sterilized shears below a leaf node.",
      "2. Dip in rooting hormone powder if planting in dry calloused soil.",
      "3. Place stem in high-humidity propagation domes or water vases.",
      "4. Transmit to standard soil once root mesh develops to 2 inches."
    ];
  } else {
    propagation.method = `${propagation.method} (Local Rule)`;
  }

  // Extract latest fertilizing log
  const fertilizingLogs = plantDetail && plantDetail.care_logs
    ? plantDetail.care_logs.filter(log => log.care_type === 'Fertilizing')
    : [];
  
  const latestFertilizing = fertilizingLogs.length > 0
    ? fertilizingLogs.sort((a, b) => new Date(b.date_completed).getTime() - new Date(a.date_completed).getTime())[0]
    : null;

  // Calculate next fertilization date based on the recommendation frequency
  let nextFertilizingDate = "Pending Log";
  if (latestFertilizing) {
    const lastDate = new Date(latestFertilizing.date_completed);
    let intervalDays = 30; // Default
    if (fertilizer.schedule.includes('14')) intervalDays = 14;
    else if (fertilizer.schedule.includes('20')) intervalDays = 20;
    else if (fertilizer.schedule.includes('45')) intervalDays = 45;
    else if (fertilizer.schedule.includes('60')) intervalDays = 60;

    const nextDate = new Date(lastDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    nextFertilizingDate = nextDate.toISOString().split('T')[0];
  }

  const handleWaterClick = async () => {
    if (isWatering || !handleWater) return;
    setIsWatering(true);
    try {
      await handleWater();
    } catch (err) {
      console.error("Watering failed:", err);
    } finally {
      setIsWatering(false);
    }
  };

  const handleFertilizeClick = async () => {
    if (handleLogFertilizer) {
      setFertilizingStatus("Logging fertilization care entry...");
      await handleLogFertilizer();
      setFertilizingStatus("🟢 Fertilization logged successfully!");
      setTimeout(() => setFertilizingStatus(null), 3000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* 1. Greenhouse Care Checklist */}
      <motion.div 
        className="glass-panel"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="section-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClipboardList size={18} style={{ color: 'var(--primary)' }} />
            <span>Greenhouse Care Checklist</span>
          </div>
          <button
            onClick={() => setShowWaterRules(!showWaterRules)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-muted)',
              fontSize: '11px',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '8px'
            }}
          >
            <HelpCircle size={13} style={{ color: 'var(--primary)' }} />
            Rules
          </button>
        </h2>

        {/* Explain routine watering rules */}
        <AnimatePresence>
          {showWaterRules && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{
                overflow: 'hidden',
                background: 'rgba(5, 150, 105, 0.05)',
                border: '1px dashed var(--primary)',
                borderRadius: '12px',
                padding: '12px',
                marginBottom: '16px',
                fontSize: '12px',
                lineHeight: 1.5,
                color: 'var(--text-main)'
              }}
            >
              <strong>💡 Smart Plant Care Scheduling Rules:</strong>
              <ul style={{ paddingLeft: '20px', marginTop: '6px', listStyleType: 'disc', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>
                  <strong>Trigger Rule:</strong> Watering alerts are triggered in the Action Center when a plant's live soil moisture falls below <strong>40%</strong>.
                </li>
                <li>
                  <strong>Schedule Sync:</strong> Completing a watering action resets the soil moisture to <strong>100%</strong> and sets a fresh base date.
                </li>
                <li>
                  <strong>Dynamic Recalculation:</strong> The <em>Next Routine Watering Date</em> recalculates as <code>Date Watered + Watering Interval Days</code> (the "every some days" schedule), adapting organically whether watered early or late.
                </li>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.div 
          className="schedule-list"
          variants={containerVariants}
          initial="hidden"
          animate="show"
          key={activePlant.id}
        >
          {/* A. Unified Water Plant Task */}
          <motion.div 
            className={`schedule-item ${isHydrated ? 'completed' : ''}`}
            variants={itemVariants}
            layout
          >
            <motion.button 
              className={`checkbox-custom ${isHydrated ? 'checked' : ''}`}
              onClick={handleWaterClick}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
              style={{
                borderColor: isHydrated ? 'var(--primary)' : 'var(--text-muted)'
              }}
            >
              {isHydrated && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  style={{ fontSize: '12px', fontWeight: 'bold' }}
                >
                  ✓
                </motion.span>
              )}
            </motion.button>
            
            <div className="schedule-details" style={{ flex: 1 }}>
              <span className="schedule-action" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                <Droplet size={14} style={{ color: isHydrated ? 'var(--primary)' : 'var(--status-critical)' }} />
                Water {activePlant.name}
              </span>
              <span className="schedule-date">
                {isHydrated 
                  ? `Healthy Hydration (Moisture at ${activePlant.latest_moisture?.toFixed(1) || 100}%)` 
                  : `⚠️ Dry Soil Warning (Moisture critically low at ${activePlant.latest_moisture?.toFixed(1) || 0}%)`
                }
              </span>
            </div>
            {isHydrated && activePlant.latest_moisture !== null && activePlant.latest_moisture < 98.0 && (
              <button 
                onClick={handleWaterClick}
                disabled={isWatering}
                style={{
                  background: 'rgba(5, 150, 105, 0.08)',
                  border: '1px solid rgba(5, 150, 105, 0.2)',
                  borderRadius: '8px',
                  color: 'var(--primary)',
                  fontSize: '11px',
                  padding: '3px 8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  opacity: isWatering ? 0.6 : 1,
                  transition: 'opacity 0.2s'
                }}
              >
                {isWatering ? 'Watering...' : 'Water Early'}
              </button>
            )}
          </motion.div>

          {/* B. AI Treatment Schedules */}
          {plantDetail && plantDetail.treatment_schedules && plantDetail.treatment_schedules.map((task) => (
            <motion.div 
              key={task.id} 
              className={`schedule-item ${task.is_completed ? 'completed' : ''}`}
              variants={itemVariants}
              layout
            >
              <motion.button 
                className={`checkbox-custom ${task.is_completed ? 'checked' : ''}`}
                onClick={() => handleToggleSchedule(task.id, task.is_completed)}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
              >
                {task.is_completed && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{ fontSize: '12px', fontWeight: 'bold' }}
                  >
                    ✓
                  </motion.span>
                )}
              </motion.button>
              
              <div className="schedule-details">
                <span className="schedule-action">{task.action}</span>
                <span className="schedule-date">Scheduled for {task.scheduled_date}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {activePlant.next_watering_date && (
          <motion.div 
            style={{ 
              marginTop: '16px', 
              paddingTop: '12px', 
              borderTop: '1px solid var(--panel-border)', 
              fontSize: '12px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <span style={{ color: 'var(--text-muted)' }}>Next Routine Watering Schedule:</span>
            <strong style={{ color: 'var(--primary)' }}>
              every {activePlant.watering_interval_days} days (Due: {activePlant.next_watering_date})
            </strong>
          </motion.div>
        )}
      </motion.div>

      {/* 2. Fertilizer & Nutrition Guide */}
      <motion.div 
        className="glass-panel"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <h2 className="section-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FlaskConical size={18} style={{ color: 'var(--primary)' }} />
            <span>🧪 Fertilizer & Nutrition Guide</span>
          </div>
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Recommended Fertilizer</span>
            <strong style={{ color: 'var(--text-heading)', fontSize: '14px' }}>{fertilizer.fertilizerName}</strong>
          </div>

          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Nutrition Frequency</span>
            <span style={{ color: 'var(--text-main)' }}>{fertilizer.schedule}</span>
          </div>

          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Dilution & Method</span>
            <span style={{ color: 'var(--text-main)', lineHeight: '1.4' }}>{fertilizer.instructions}</span>
          </div>

          <div 
            style={{ 
              background: 'var(--input-bg)', 
              borderRadius: '12px', 
              padding: '12px', 
              border: '1px solid var(--panel-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Info size={12} />
              Botanical Tips & Modifiers
            </span>
            <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              {fertilizer.tips.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>

          {/* Fertilizing Schedule Dates & Manual Logger */}
          <div 
            style={{ 
              marginTop: '12px', 
              paddingTop: '12px', 
              borderTop: '1px solid var(--panel-border)', 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Last Fertilized: <strong style={{ color: 'var(--text-heading)' }}>{latestFertilizing ? new Date(latestFertilizing.date_completed).toISOString().split('T')[0] : 'Never'}</strong>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Next Due Date: <strong style={{ color: 'var(--primary)' }}>{nextFertilizingDate}</strong>
              </div>
            </div>

            {activePlant.maturity_stage !== 'cutting' && activePlant.maturity_stage !== 'propagation' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <motion.button
                  onClick={handleFertilizeClick}
                  disabled={!!fertilizingStatus}
                  className="btn btn-secondary"
                  style={{
                    padding: '6px 12px',
                    fontSize: '11.5px',
                    borderRadius: '8px',
                    borderColor: 'var(--primary)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: 600
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <FlaskConical size={12} />
                  Log Fertilization
                </motion.button>
                {fertilizingStatus && (
                  <span style={{ fontSize: '10px', color: 'var(--primary)', fontStyle: 'italic' }}>
                    {fertilizingStatus}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* 3. Propagation & Cutting Guide */}
      <motion.div 
        className="glass-panel"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <h2 className="section-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scissors size={18} style={{ color: 'var(--primary)' }} />
            <span>🌱 Propagation & Cutting Guide</span>
          </div>
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Method</span>
              <strong style={{ color: 'var(--text-heading)', fontSize: '14px' }}>{propagation.method}</strong>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '8px',
                fontWeight: 600,
                color: propagation.difficulty === 'Easy' ? 'var(--status-healthy)' : 'var(--status-warning)',
                background: propagation.difficulty === 'Easy' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                border: propagation.difficulty === 'Easy' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)'
              }}>
                {propagation.difficulty} Difficulty
              </span>
            </div>
          </div>

          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Best Season</span>
            <span style={{ color: 'var(--text-main)' }}>{propagation.bestSeason}</span>
          </div>

          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>Step-by-Step Directions</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {propagation.guideSteps.map((step, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', lineHeight: '1.4' }}>
                  <span 
                    style={{ 
                      width: '18px', 
                      height: '18px', 
                      borderRadius: '50%', 
                      background: 'rgba(5, 150, 105, 0.1)', 
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span style={{ color: 'var(--text-main)', fontSize: '12.5px' }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
