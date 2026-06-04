import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Search, Sprout, Droplet, Sparkles, Loader2, 
  ChevronRight, ChevronLeft, Home, Sun, Calendar, Plus, Check, Image
} from 'lucide-react';

interface AddPlantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlantAdded: (newPlantId: number) => void;
}

interface SearchResult {
  id: number;
  common_name: string;
  scientific_name: string[] | string;
  image_url?: string | null;
}

interface SpeciesDetails {
  species_id: number;
  common_name: string;
  scientific_name: string;
  watering: string;
  watering_interval_days: number;
  image_url?: string | null;
  sunlight?: string[];
  propagation_methods?: string | null;
  fertilizer_guideline?: string | null;
}

export default function AddPlantModal({ isOpen, onClose, onPlantAdded }: AddPlantModalProps) {
  // Wizard Step State
  // Steps: 1 (Search), 1.5 (Botanical Preview), 2 (Profile & Pot), 3 (Mix & Last Watered), 4 (Room & Light)
  const [step, setStep] = useState<number>(1);
  
  // Questionnaire States
  const [nickname, setNickname] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<SearchResult | null>(null);
  const [speciesDetails, setSpeciesDetails] = useState<SpeciesDetails | null>(null);
  const [wateringInterval, setWateringInterval] = useState<number>(7);
  
  // Pot & Potting Details
  const [maturityStage, setMaturityStage] = useState<'Mature Plant' | 'Cutting'>('Mature Plant');
  const [potSize, setPotSize] = useState<string>('8"');
  const [potHeight, setPotHeight] = useState<string>('Standard');
  const [pottingMix, setPottingMix] = useState<string>('Standard Soil');
  const [repottedStatus, setRepottedStatus] = useState<string>('Recently (< 3 months)');

  // Date helpers for last watered offsets
  const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getPastDateString = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysOffset);
    return d.toISOString().split('T')[0];
  };

  const [lastWateredDate, setLastWateredDate] = useState<string>(getTodayDateString());

  
  // Location & Light
  const [rooms, setRooms] = useState<string[]>(['Living Room', 'Bedroom', 'Kitchen', 'Office', 'Balcony', 'Bathroom']);
  const [selectedRoom, setSelectedRoom] = useState<string>('Living Room');
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [customRoomName, setCustomRoomName] = useState('');
  const [lightCondition, setLightCondition] = useState<string>('Full Indirect Sun');
  
  // Loading & UI States
  const [searching, setSearching] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Custom Photo Upload States & Refs
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const API_BASE = 'http://127.0.0.1:8000';

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setNickname('');
      setSearchQuery('');
      setSelectedSpecies(null);
      setSpeciesDetails(null);
      setWateringInterval(7);
      setMaturityStage('Mature Plant');
      setPotSize('8"');
      setPotHeight('Standard');
      setPottingMix('Standard Soil');
      setRepottedStatus('Recently (< 3 months)');
      setLastWateredDate(getTodayDateString());
      setSelectedRoom('Living Room');
      setLightCondition('Full Indirect Sun');
      setError(null);
      setCustomImageUrl(null);
      setUploadingPhoto(false);
    }
  }, [isOpen]);

  // Handle outside clicks to close autocomplete dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search trigger
  useEffect(() => {
    if (searchQuery.trim().length < 2 || (selectedSpecies && searchQuery === selectedSpecies.common_name)) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/plants/database-search?q=${encodeURIComponent(searchQuery)}`);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        
        const results = (data.data || data) as SearchResult[];
        setSearchResults(results.slice(0, 8)); // Limit to top 8 suggestions
        setShowDropdown(true);
      } catch (err) {
        console.error('Failed to search Perenual:', err);
      } finally {
        setSearching(false);
      }
    }, 450);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, selectedSpecies]);

  // Fetch full details and transition to step 1.5 details preview
  const handleSelectSpecies = async (species: SearchResult) => {
    setShowDropdown(false);
    setSelectedSpecies(species);
    setSearchQuery(species.common_name);
    setFetchingDetails(true);
    setError(null);
    setStep(1.5); // Move to botanical preview step!

    try {
      const res = await fetch(`${API_BASE}/api/plants/database-details/${species.id}`);
      if (!res.ok) throw new Error('Failed to retrieve care details');
      const details = (await res.json()) as SpeciesDetails;
      
      setSpeciesDetails(details);
      if (details.watering_interval_days) {
        setWateringInterval(details.watering_interval_days);
      }
      
      // Auto-extract sunlight preferences to seed the lights step if available
      if (details.sunlight && details.sunlight.length > 0) {
        const sunMatch = details.sunlight[0].toLowerCase();
        if (sunMatch.includes('full sun') || sunMatch.includes('direct sun')) {
          setLightCondition('Full Direct Sun');
        } else if (sunMatch.includes('indirect')) {
          setLightCondition('Full Indirect Sun');
        } else if (sunMatch.includes('part') || sunMatch.includes('sun')) {
          setLightCondition('Part Shade / Part Sun');
        } else if (sunMatch.includes('shade') || sunMatch.includes('low')) {
          setLightCondition('Shade');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError('Could not retrieve detailed botanical profile. Reverted to standard profile.');
      setSpeciesDetails({
        species_id: species.id,
        common_name: species.common_name,
        scientific_name: Array.isArray(species.scientific_name) ? species.scientific_name[0] : (species.scientific_name || species.common_name),
        watering: 'Average',
        watering_interval_days: 7,
        image_url: species.image_url || 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&q=80&w=400',
        sunlight: ['Full Indirect Sun']
      });
      setWateringInterval(7);
    } finally {
      setFetchingDetails(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setUploadingPhoto(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch(`${API_BASE}/api/plants/upload-photo`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Photo upload failed');
      const data = await res.json();
      setCustomImageUrl(data.url);
    } catch (err: any) {
      console.error(err);
      setError('Failed to upload custom photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Add a new room on the fly
  const handleAddNewRoom = () => {
    if (customRoomName.trim() && !rooms.includes(customRoomName.trim())) {
      const newRoom = customRoomName.trim();
      setRooms([...rooms, newRoom]);
      setSelectedRoom(newRoom);
      setCustomRoomName('');
      setShowAddRoom(false);
    }
  };

  // Submit and save the plant with complete questionnaire
  const handleSubmit = async () => {
    if (!nickname.trim() || !selectedSpecies) {
      setError('Nickname and Species selection are strictly required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const speciesName = speciesDetails?.scientific_name || selectedSpecies.common_name;
    const finalImage = customImageUrl || speciesDetails?.image_url || selectedSpecies.image_url || 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&q=80&w=400';

    // Convert selected calendar date string directly to ISO timestamp
    const finalLastWateredDate = new Date(lastWateredDate);
    const isoLastWatered = isNaN(finalLastWateredDate.getTime()) ? new Date().toISOString() : finalLastWateredDate.toISOString();

    try {
      const payload = {
        name: nickname.trim(),
        species: speciesName,
        watering_interval_days: wateringInterval,
        image_url: finalImage,
        last_watered_date: isoLastWatered,
        pot_size: potSize,
        pot_height: potHeight,
        potting_mix: pottingMix,
        location: selectedRoom,
        light_condition: lightCondition,
        maturity_stage: maturityStage,
        repotted_status: repottedStatus,
        propagation_methods: speciesDetails?.propagation_methods || null,
        fertilizer_guideline: speciesDetails?.fertilizer_guideline || null
      };

      const res = await fetch(`${API_BASE}/api/plants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Onboarding registration failed');
      }

      const newPlant = await res.json();
      onPlantAdded(newPlant.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to complete plant onboarding.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper calculation for progress percentage
  const getProgressPercentage = () => {
    if (step === 1) return 10;
    if (step === 1.5) return 25;
    if (step === 2) return 50;
    if (step === 3) return 75;
    return 100;
  };

  const getStepTitle = () => {
    if (step === 1) return "Identify Species";
    if (step === 1.5) return "Verify Species";
    if (step === 2) return "Plant Profile & Potting";
    if (step === 3) return "Substrate & Hydration";
    return "Home Environment";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay" style={overlayStyle}>
          {/* Backdrop blur */}
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={backdropStyle}
          />

          {/* Planta Wizard Container Card */}
          <motion.div
            className="glass-panel modal-card"
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ type: 'spring', damping: 26, stiffness: 340 }}
            style={cardStyle}
          >
            {/* Header with Progress Bar */}
            <div style={wizardHeaderStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sprout size={18} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', tracking: '0.05em', color: 'var(--primary)' }}>
                    Step {step === 1.5 ? "1.5" : step} of 4: {getStepTitle()}
                  </span>
                </div>
                <button onClick={onClose} style={closeButtonStyle}>
                  <X size={16} />
                </button>
              </div>

              {/* Progress bar container */}
              <div style={progressTrackStyle}>
                <motion.div 
                  style={progressBarStyle} 
                  animate={{ width: `${getProgressPercentage()}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Error alerts */}
            {error && (
              <div style={errorStyle}>
                <Sparkles size={14} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Steps Wizard Panel */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
              <AnimatePresence mode="wait">
                
                {/* STEP 1: Search & Autocomplete suggestions */}
                {step === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.22 }}
                    style={stepLayout}
                  >
                    <p style={guideTextStyle}>
                      Search for your plant botanical species. Our system will download optimized care schedules and moisture benchmarks dynamically.
                    </p>

                    <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
                      <label style={labelStyle}>Botanical Species</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          type="text"
                          required
                          placeholder="Search species (e.g. Monstera, Snake, Peace Lily...)"
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setSelectedSpecies(null);
                          }}
                          style={{ ...inputStyle, paddingLeft: '40px', paddingRight: '40px' }}
                        />
                        <div style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }}>
                          <Search size={16} />
                        </div>
                        <div style={{ position: 'absolute', right: '12px', display: 'flex', alignItems: 'center' }}>
                          {searching && <Loader2 className="spinner" size={16} style={{ color: 'var(--primary)' }} />}
                        </div>
                      </div>

                      {/* AutocompleteDropdown with thumbnails */}
                      <AnimatePresence>
                        {showDropdown && searchResults.length > 0 && (
                          <motion.div
                            className="autocomplete-dropdown"
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            style={dropdownStyle}
                          >
                            {searchResults.map((result) => {
                              const sciName = Array.isArray(result.scientific_name)
                                ? result.scientific_name[0]
                                : result.scientific_name;
                              return (
                                <div
                                  key={result.id}
                                  className="dropdown-item"
                                  onClick={() => handleSelectSpecies(result)}
                                  style={dropdownItemStyle}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={thumbContainerStyle}>
                                      {result.image_url ? (
                                        <img src={result.image_url} alt={result.common_name} style={thumbImgStyle} />
                                      ) : (
                                        <Sprout size={14} style={{ color: 'var(--primary)' }} />
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                      <strong style={{ color: 'var(--text-heading)', fontSize: '13px' }}>{result.common_name}</strong>
                                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>{sciName}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Pre-populated offline quick-selection chips */}
                    <div style={{ marginTop: '20px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                        Popular Offline Options
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {[
                          { id: -1, common_name: "Monstera" },
                          { id: -2, common_name: "Fiddle Leaf Fig" },
                          { id: -3, common_name: "Snake Plant" },
                          { id: -4, common_name: "Pothos" },
                          { id: -9, common_name: "ZZ Plant" }
                        ].map((chip) => (
                          <button
                            key={chip.id}
                            type="button"
                            onClick={() => handleSelectSpecies({ id: chip.id, common_name: chip.common_name, scientific_name: chip.common_name })}
                            style={chipButtonStyle}
                          >
                            <Plus size={12} />
                            {chip.common_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 1.5: Visual Botanical Detail Verification */}
                {step === 1.5 && (
                  <motion.div
                    key="step-1.5"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    style={stepLayout}
                  >
                    {fetchingDetails ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '16px' }}>
                        <Loader2 className="spinner" size={32} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Retrieving detailed botanical profile...</span>
                      </div>
                    ) : (
                      <div style={previewCardStyle}>
                        {/* Large Cover Image */}
                        <div style={previewImageContainerStyle}>
                          <img 
                            src={speciesDetails?.image_url || 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&q=80&w=400'} 
                            alt={speciesDetails?.common_name} 
                            style={previewImageStyle} 
                          />
                        </div>

                        {/* Description Facts */}
                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div>
                            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-heading)', margin: 0 }}>
                              {speciesDetails?.common_name}
                            </h2>
                            <p style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                              {speciesDetails?.scientific_name}
                            </p>
                          </div>

                          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                            <div style={pillFactStyle}>
                              <Droplet size={12} style={{ color: 'var(--primary)' }} />
                              <span>Watering: {speciesDetails?.watering}</span>
                            </div>
                            <div style={pillFactStyle}>
                              <Sun size={12} style={{ color: 'var(--secondary)' }} />
                              <span>Sunlight: {speciesDetails?.sunlight?.join(', ') || 'Indirect Light'}</span>
                            </div>
                          </div>

                          <div style={factCardStyle}>
                            <Sparkles size={14} style={{ color: 'var(--primary)' }} />
                            <p style={{ fontSize: '11px', color: 'var(--text-main)', margin: 0, lineHeight: '1.4' }}>
                              Watering Interval automatically calculated at <strong>every {wateringInterval} days</strong> based on species transpiration rate.
                            </p>
                          </div>
                        </div>

                        <div style={footerStyle}>
                          <button 
                            type="button" 
                            className="btn btn-secondary" 
                            onClick={() => setStep(1)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <ChevronLeft size={14} /> Back
                          </button>
                          <button 
                            type="button" 
                            className="btn btn-primary" 
                            onClick={() => setStep(2)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            This is my plant! <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* STEP 2: Profile & Pot dimensions */}
                {step === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    style={stepLayout}
                  >
                    {/* Plant Nickname */}
                    <div className="form-group">
                      <label style={labelStyle}>What is your plant's nickname?</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Monty, Lily, Leafy"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    {/* Optional Custom Photo Upload */}
                    <div className="form-group" style={{ marginTop: '10px' }}>
                      <label style={labelStyle}>Plant Photo (Optional)</label>
                      <div 
                        style={{
                          border: '2px dashed var(--input-border)',
                          borderRadius: '12px',
                          padding: '16px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          background: 'var(--input-bg)',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'all 0.2s ease',
                        }}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handlePhotoUpload}
                          accept="image/*"
                          style={{ display: 'none' }}
                        />
                        {uploadingPhoto ? (
                          <>
                            <Loader2 className="spinner" size={24} style={{ color: 'var(--primary)' }} />
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Uploading photo...</span>
                          </>
                        ) : customImageUrl ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', justifyContent: 'center' }}>
                            <img 
                              src={customImageUrl} 
                              alt="Uploaded preview" 
                              style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} 
                            />
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)' }}>Custom photo uploaded! ✅</span>
                          </div>
                        ) : (
                          <>
                            <Image size={24} style={{ color: 'var(--text-muted)' }} />
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>Click to upload custom picture</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Otherwise, we will use the default botanical image</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Maturity Stage (Mature vs Cutting) */}
                    <div className="form-group" style={{ marginTop: '10px' }}>
                      <label style={labelStyle}>Maturity Stage</label>
                      <div style={toggleRowStyle}>
                        {[
                          { id: 'Mature Plant', label: 'Mature Plant 🌳', desc: 'Established root systems' },
                          { id: 'Cutting', label: 'Cutting 🌱', desc: 'Propagation or seedling' }
                        ].map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setMaturityStage(m.id as any)}
                            style={maturityStage === m.id ? toggleSelectedStyle : toggleButtonStyle}
                          >
                            <span style={{ fontWeight: 700, fontSize: '13px', display: 'block' }}>{m.label}</span>
                            <span style={{ fontSize: '10px', opacity: 0.8 }}>{m.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pot Size Diameter */}
                    <div className="form-group" style={{ marginTop: '10px' }}>
                      <label style={labelStyle}>Pot Diameter (Width)</label>
                      <div style={pillRowStyle}>
                        {['4"', '6"', '8"', '10"', '12"', '14"+'].map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setPotSize(size)}
                            style={potSize === size ? pillSelectedStyle : pillButtonStyle}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pot Height Depth */}
                    <div className="form-group" style={{ marginTop: '10px' }}>
                      <label style={labelStyle}>Pot Height / Depth</label>
                      <div style={toggleRowStyle}>
                        {['Shallow', 'Standard', 'Tall'].map((height) => (
                          <button
                            key={height}
                            type="button"
                            onClick={() => setPotHeight(height)}
                            style={potHeight === height ? toggleSelectedStyle : toggleButtonStyle}
                          >
                            {height}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={footerStyle}>
                      <button type="button" className="btn btn-secondary" onClick={() => setStep(1.5)}>
                        <ChevronLeft size={14} /> Back
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        onClick={() => {
                          if (!nickname.trim()) {
                            setError("Nickname cannot be blank!");
                          } else {
                            setError(null);
                            setStep(3);
                          }
                        }}
                      >
                        Continue <ChevronRight size={14} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: Potting Mix & Watering offsets */}
                {step === 3 && (
                  <motion.div
                    key="step-3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    style={stepLayout}
                  >
                    {/* Potting Mix Cards */}
                    <div className="form-group">
                      <label style={labelStyle}>What kind of potting mix?</label>
                      <div style={gridRowStyle}>
                        {[
                          { id: 'Standard Soil', label: 'Standard Soil', emoji: '🟫', desc: 'Retains average water' },
                          { id: 'Succulent / Cactus Mix', label: 'Succulent Mix', emoji: '🏜️', desc: 'Highly draining, sandy' },
                          { id: 'Aerated Aroid Mix', label: 'Aroid Mix', emoji: '🪴', desc: 'Chunky bark, fast drain' },
                          { id: 'Orchid Bark Mix', label: 'Orchid Mix', emoji: '🪵', desc: 'Very chunky, high airflow' },
                          { id: 'Peat-based Mix', label: 'Peat Mix', emoji: '🌿', desc: 'High water retention' },
                          { id: 'Nursery Soil', label: 'Nursery Soil', emoji: '🏡', desc: 'Dense peat, holds water' }
                        ].map((mix) => (
                          <button
                            key={mix.id}
                            type="button"
                            onClick={() => setPottingMix(mix.id)}
                            style={pottingMix === mix.id ? cardSelectedStyle : cardButtonStyle}
                          >
                            <span style={{ fontSize: '18px' }}>{mix.emoji}</span>
                            <strong style={{ display: 'block', fontSize: '12px', marginTop: '4px', color: 'var(--text-heading)' }}>{mix.label}</strong>
                            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{mix.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Repotted status */}
                    <div className="form-group" style={{ marginTop: '10px' }}>
                      <label style={labelStyle}>When was it last repotted?</label>
                      <div style={pillRowStyle}>
                        {[
                          'Recently (< 3 m)', 
                          '6-12 months ago', 
                          'Over a year ago', 
                          'Never / Nursery Pot'
                        ].map((rep) => (
                          <button
                            key={rep}
                            type="button"
                            onClick={() => setRepottedStatus(rep)}
                            style={repottedStatus === rep ? pillSelectedStyle : pillButtonStyle}
                          >
                            {rep}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Last Watered choices */}
                    <div className="form-group" style={{ marginTop: '10px' }}>
                      <label style={labelStyle}>When did you last water it?</label>
                      <div style={pillRowStyle}>
                        {[
                          { label: 'Today 💧', offset: 0 },
                          { label: 'Yesterday', offset: 1 },
                          { label: '2 days ago', offset: 2 },
                          { label: '3 days ago', offset: 3 },
                          { label: '5 days ago', offset: 5 },
                          { label: 'A week ago', offset: 7 },
                          { label: 'Never / Dry 🏜️', offset: 10 }
                        ].map((ch) => {
                          const targetDateStr = getPastDateString(ch.offset);
                          const isActive = lastWateredDate === targetDateStr;
                          return (
                            <button
                              key={ch.label}
                              type="button"
                              onClick={() => setLastWateredDate(targetDateStr)}
                              style={isActive ? pillSelectedStyle : pillButtonStyle}
                            >
                              {ch.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom calendar date picker */}
                      <div style={{ marginTop: '14px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                          Or choose a specific calendar date:
                        </span>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <input 
                            type="date"
                            value={lastWateredDate}
                            max={getTodayDateString()} // cannot water in the future!
                            onChange={(e) => setLastWateredDate(e.target.value)}
                            style={{ 
                              ...inputStyle, 
                              cursor: 'pointer',
                              border: '1px solid var(--primary)', 
                              boxShadow: '0 0 0 1px rgba(5, 150, 105, 0.15)'
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={footerStyle}>
                      <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
                        <ChevronLeft size={14} /> Back
                      </button>
                      <button type="button" className="btn btn-primary" onClick={() => setStep(4)}>
                        Continue <ChevronRight size={14} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 4: Location Room & Sunlight condition cards */}
                {step === 4 && (
                  <motion.div
                    key="step-4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    style={stepLayout}
                  >
                    {/* Location picker */}
                    <div className="form-group" style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={labelStyle}>Where is it located?</label>
                        <button 
                          type="button" 
                          onClick={() => setShowAddRoom(!showAddRoom)} 
                          style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: '3px' }}
                        >
                          <Plus size={12} /> {showAddRoom ? "Cancel" : "Add Room"}
                        </button>
                      </div>

                      {!showAddRoom ? (
                        <select
                          value={selectedRoom}
                          onChange={(e) => setSelectedRoom(e.target.value)}
                          style={selectStyle}
                        >
                          {rooms.map((room) => (
                            <option key={room} value={room}>{room}</option>
                          ))}
                        </select>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <input
                            type="text"
                            placeholder="Enter room name (e.g. Nursery, Porch)"
                            value={customRoomName}
                            onChange={(e) => setCustomRoomName(e.target.value)}
                            style={{ ...inputStyle, flex: 1 }}
                          />
                          <button
                            type="button"
                            onClick={handleAddNewRoom}
                            style={{ 
                              padding: '0 16px', 
                              backgroundColor: 'var(--primary)', 
                              color: '#fff', 
                              border: 'none', 
                              borderRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Check size={16} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Light conditions card selections */}
                    <div className="form-group" style={{ marginTop: '10px' }}>
                      <label style={labelStyle}>Light Conditions</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[
                          { id: 'Shade', label: 'Shade 🌑', desc: 'Low indirect light, deep inside rooms' },
                          { id: 'Part Shade / Part Sun', label: 'Part Shade / Part Sun ⛅', desc: 'Filtered shade with intermittent sun rays' },
                          { id: 'Full Indirect Sun', label: 'Full Indirect Sun 🌤️', desc: 'Bright, high filtration close to north/east windows' },
                          { id: 'Full Direct Sun', label: 'Full Direct Sun ☀️', desc: 'Sun-drenched windows, intense hot rays' }
                        ].map((light) => (
                          <button
                            key={light.id}
                            type="button"
                            onClick={() => setLightCondition(light.id)}
                            style={lightCondition === light.id ? listSelectedStyle : listButtonStyle}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                              <strong style={{ fontSize: '13px', color: 'var(--text-heading)' }}>{light.label}</strong>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{light.desc}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={footerStyle}>
                      <button type="button" className="btn btn-secondary" onClick={() => setStep(3)} disabled={submitting}>
                        <ChevronLeft size={14} /> Back
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        onClick={handleSubmit}
                        style={{ minWidth: '150px', justifyContent: 'center' }}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="spinner" size={14} />
                            Registering...
                          </>
                        ) : (
                          <>
                            <Droplet size={14} />
                            Register Plant 🌿
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Styling Object Tokens (High-End Glassmorphic Design)
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px'
};

const backdropStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(5, 18, 12, 0.45)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  zIndex: -1
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '520px',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  borderRadius: '24px',
  backgroundColor: 'var(--panel-bg)',
  border: '1px solid var(--panel-border)',
  boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.18)',
  position: 'relative',
  padding: '24px',
  overflow: 'hidden'
};

const wizardHeaderStyle: React.CSSProperties = {
  borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
  paddingBottom: '12px'
};

const closeButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--text-muted)',
  padding: '4px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.2s'
};

const progressTrackStyle: React.CSSProperties = {
  width: '100%',
  height: '6px',
  backgroundColor: 'rgba(0, 0, 0, 0.05)',
  borderRadius: '3px',
  overflow: 'hidden'
};

const progressBarStyle: React.CSSProperties = {
  height: '100%',
  backgroundColor: 'var(--primary)',
  borderRadius: '3px'
};

const stepLayout: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px'
};

const guideTextStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--text-muted)',
  margin: 0,
  lineHeight: '1.4'
};

const labelStyle: React.CSSProperties = {
  fontSize: '12.5px',
  fontWeight: 700,
  color: 'var(--text-heading)',
  marginBottom: '6px',
  display: 'block'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '12px',
  backgroundColor: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  color: 'var(--text-heading)',
  fontSize: '13.5px',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s'
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '12px',
  backgroundColor: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  color: 'var(--text-heading)',
  fontSize: '13.5px',
  outline: 'none',
  cursor: 'pointer'
};

const chipButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '6px 12px',
  borderRadius: '20px',
  border: '1px solid var(--input-border)',
  backgroundColor: 'var(--input-bg)',
  color: 'var(--text-main)',
  fontSize: '11px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.18s ease'
};

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 4px)',
  left: 0,
  width: '100%',
  backgroundColor: 'var(--panel-bg)',
  border: '1px solid var(--panel-border)',
  borderRadius: '12px',
  boxShadow: 'var(--card-shadow)',
  zIndex: 100,
  maxHeight: '180px',
  overflowY: 'auto',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)'
};

const dropdownItemStyle: React.CSSProperties = {
  padding: '8px 12px',
  cursor: 'pointer',
  transition: 'background-color 0.18s ease',
  borderBottom: '1px solid rgba(0, 0, 0, 0.03)'
};

const thumbContainerStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(5, 150, 105, 0.05)',
  border: '1px solid rgba(5, 150, 105, 0.1)',
  flexShrink: 0
};

const thumbImgStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover'
};

const previewCardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  borderRadius: '16px',
  border: '1px solid var(--panel-border)',
  backgroundColor: 'var(--input-bg)',
  overflow: 'hidden'
};

const previewImageContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '180px',
  overflow: 'hidden'
};

const previewImageStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover'
};

const pillFactStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  borderRadius: '14px',
  backgroundColor: 'var(--panel-bg)',
  border: '1px solid var(--panel-border)',
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--text-main)'
};

const factCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 14px',
  borderRadius: '12px',
  backgroundColor: 'rgba(5, 150, 105, 0.06)',
  border: '1px solid rgba(5, 150, 105, 0.15)'
};

const toggleRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '10px'
};

const toggleButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px 14px',
  borderRadius: '12px',
  border: '1px solid var(--input-border)',
  backgroundColor: 'var(--input-bg)',
  color: 'var(--text-main)',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'all 0.18s ease'
};

const toggleSelectedStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px 14px',
  borderRadius: '12px',
  border: '2px solid var(--primary)',
  backgroundColor: 'rgba(5, 150, 105, 0.06)',
  color: 'var(--primary-dark)',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'all 0.18s ease'
};

const pillRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px'
};

const pillButtonStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: '20px',
  border: '1px solid var(--input-border)',
  backgroundColor: 'var(--input-bg)',
  color: 'var(--text-main)',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.18s ease'
};

const pillSelectedStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: '20px',
  border: '1.5px solid var(--primary)',
  backgroundColor: 'rgba(5, 150, 105, 0.08)',
  color: 'var(--primary-dark)',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.18s ease'
};

const gridRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '8px'
};

const cardButtonStyle: React.CSSProperties = {
  padding: '12px 10px',
  borderRadius: '12px',
  border: '1px solid var(--input-border)',
  backgroundColor: 'var(--input-bg)',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  transition: 'all 0.18s ease'
};

const cardSelectedStyle: React.CSSProperties = {
  padding: '12px 10px',
  borderRadius: '12px',
  border: '2px solid var(--primary)',
  backgroundColor: 'rgba(5, 150, 105, 0.08)',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  transition: 'all 0.18s ease'
};

const listButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '12px',
  border: '1px solid var(--input-border)',
  backgroundColor: 'var(--input-bg)',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'all 0.18s'
};

const listSelectedStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '12px',
  border: '2px solid var(--primary)',
  backgroundColor: 'rgba(5, 150, 105, 0.06)',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'all 0.18s'
};

const footerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
  marginTop: '8px',
  borderTop: '1px solid rgba(0, 0, 0, 0.05)',
  paddingTop: '16px'
};

const errorStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: 'rgba(239, 68, 68, 0.08)',
  border: '1px solid rgba(239, 68, 68, 0.2)',
  color: 'var(--status-critical)',
  padding: '10px 14px',
  borderRadius: '10px',
  fontSize: '12px',
  marginBottom: '4px'
};
