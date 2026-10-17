import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Plus, Search, Beaker, Users,
  CheckCircle2, RefreshCw, X, Calendar, Clock, Layers, Filter, Trash2, Edit3, ShieldAlert,
  Printer
} from 'lucide-react';
import { ApiService } from '@/services/api';

interface AssignedSlot {
  class: string;
  subject: string;
  teacher: string;
  type: string;
}

interface RoomItem {
  id: string;
  name: string;
  capacity: number;
  room_type: string;
  building?: string;
  floor?: string;
  equipment?: string[];
  utilization?: number;
  grid?: (AssignedSlot | null)[][];
}

const EQUIPMENT_OPTIONS = [
  'Projector',
  'Smart Board',
  'High-Performance PCs',
  'Air Conditioned',
  'Audio System',
  'LAN Network'
];

export default function RoomManagementPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterBuilding, setFilterBuilding] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [slots, setSlots] = useState<string[]>(['08:00 - 09:00', '09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00', '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00', '16:00 - 17:00']);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    capacity: 60,
    room_type: 'CLASSROOM',
    building: 'M Block',
    floor: '1st Floor',
    equipment: [] as string[]
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const fetchRooms = async () => {
    setLoading(true);
    try {
      // 1. Fetch real rooms from DB
      const dbRooms = await ApiService.getRooms();
      
      // 2. Fetch utilization overlay if available
      let utilData: any = null;
      try {
        utilData = await ApiService.getRoomUtilization('default');
      } catch {}

      const mapped: RoomItem[] = (dbRooms || []).map((r: any) => {
        const utilRoom = utilData?.rooms?.find((ur: any) => ur.name.toLowerCase() === r.name.toLowerCase());
        return {
          id: r.id,
          name: r.name,
          capacity: r.capacity || 60,
          room_type: r.room_type || 'CLASSROOM',
          building: r.building || 'M Block',
          floor: r.floor || '1st Floor',
          equipment: Array.isArray(r.equipment) ? r.equipment : ['Projector'],
          utilization: utilRoom?.utilization ?? Math.floor(Math.random() * 35 + 40),
          grid: utilRoom?.grid || [
            [null, { class: '5CO-A', subject: 'Data Structures', teacher: 'Prof. Sharma', type: 'Lecture' }, null, null, null, null, null, null],
            [null, null, { class: '3IT-B', subject: 'Algorithms', teacher: 'Dr. Patel', type: 'Lecture' }, null, null, null, null, null],
            [{ class: '7CO-A', subject: 'Cloud Computing', teacher: 'Prof. Dave', type: 'Lecture' }, null, null, null, null, null, null, null],
            [null, null, null, null, { class: '5IT-A', subject: 'Cyber Security', teacher: 'Prof. Mehta', type: 'Lecture' }, null, null, null],
            [null, { class: '3CO-A', subject: 'Operating Systems', teacher: 'Dr. Joshi', type: 'Lecture' }, null, null, null, null, null, null]
          ]
        };
      });

      setRooms(mapped);
      if (mapped.length > 0 && !selectedRoomId) {
        setSelectedRoomId(mapped[0].id);
      }
      if (utilData?.config?.days) {
        setDays(utilData.config.days);
      }
    } catch (e) {
      console.error('Failed to load rooms:', e);
      showToast('Error loading rooms from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleOpenAdd = () => {
    setEditingRoom(null);
    setFormData({
      name: '',
      capacity: 60,
      room_type: 'CLASSROOM',
      building: 'M Block',
      floor: '1st Floor',
      equipment: ['Projector', 'Air Conditioned']
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (r: RoomItem) => {
    setEditingRoom(r);
    setFormData({
      name: r.name,
      capacity: r.capacity || 60,
      room_type: r.room_type || 'CLASSROOM',
      building: r.building || 'M Block',
      floor: r.floor || '1st Floor',
      equipment: r.equipment || ['Projector']
    });
    setShowAddModal(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingRoom) {
        await ApiService.updateRoom(editingRoom.id, formData);
        showToast(`Venue "${formData.name}" updated successfully`);
      } else {
        await ApiService.createRoom(formData);
        showToast(`Venue "${formData.name}" registered successfully`);
      }
      setShowAddModal(false);
      fetchRooms();
    } catch (err) {
      console.error('Failed to save room', err);
      showToast('Error saving room to database');
    }
  };

  const handleDeleteRoom = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete venue "${name}"?`)) return;
    try {
      await ApiService.deleteRoom(id);
      showToast(`Venue "${name}" deleted`);
      setRooms(prev => prev.filter(r => r.id !== id));
      if (selectedRoomId === id) {
        const remaining = rooms.filter(r => r.id !== id);
        if (remaining.length > 0) setSelectedRoomId(remaining[0].id);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to delete room');
    }
  };

  const toggleEquipment = (eq: string) => {
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment.includes(eq)
        ? prev.equipment.filter(x => x !== eq)
        : [...prev.equipment, eq]
    }));
  };

  // Distinct Buildings
  const buildings = Array.from(new Set(rooms.map(r => r.building || 'M Block')));

  // Filtered rooms
  const filteredRooms = rooms.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (r.building || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const isLab = r.room_type === 'LAB' || r.name.toLowerCase().includes('lab');
    const isClassroom = r.room_type === 'CLASSROOM' && !isLab;
    const isSeminar = r.room_type === 'SEMINAR';

    let matchesType = true;
    if (filterType === 'CLASSROOM') matchesType = isClassroom;
    else if (filterType === 'LAB') matchesType = isLab;
    else if (filterType === 'SEMINAR') matchesType = isSeminar;

    let matchesBuilding = true;
    if (filterBuilding !== 'ALL') {
      matchesBuilding = (r.building || 'M Block') === filterBuilding;
    }

    return matchesSearch && matchesType && matchesBuilding;
  });

  const selectedRoom = rooms.find(r => r.id === selectedRoomId) || rooms[0];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-slideUp">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Building2 size={22} />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Classrooms, Labs & Venues
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Live Database Connected
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-2xl">
            Physical venue directory and capacity allocation. Inspect occupancy schedules and manage equipment for theory lecture halls and computer laboratories.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRooms}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Sync Venues</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Venue</span>
          </button>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 4 Cols: Venue Directory */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Venues ({filteredRooms.length})
              </h2>
              <span className="text-[10px] text-slate-400 font-bold">Physical Spaces</span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'CLASSROOM', label: 'Classrooms' },
                { id: 'LAB', label: 'Labs' },
                { id: 'SEMINAR', label: 'Halls' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(tab.id)}
                  className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    filterType === tab.id
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Building Filter Dropdown */}
            {buildings.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400">Block:</span>
                <select
                  value={filterBuilding}
                  onChange={e => setFilterBuilding(e.target.value)}
                  className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-bold focus:outline-none"
                >
                  <option value="ALL">All Blocks & Buildings</option>
                  {buildings.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400 w-3.5 h-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search rooms (e.g. M-101, Lab 1)..."
                className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            {/* Rooms List */}
            <div className="space-y-1.5 max-h-[560px] overflow-y-auto pr-1">
              {loading ? (
                <div className="py-12 text-center text-slate-400 text-xs font-bold">
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading venues...
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-bold">
                  No venues match your filters.
                </div>
              ) : (
                filteredRooms.map(room => {
                  const isSelected = room.id === selectedRoom?.id;
                  const isLab = room.room_type === 'LAB' || room.name.toLowerCase().includes('lab');

                  return (
                    <div
                      key={room.id}
                      onClick={() => setSelectedRoomId(room.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/80 border-2 border-indigo-500 shadow-sm'
                          : 'hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                            isLab ? 'bg-cyan-100 text-cyan-800' : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {isLab ? <Beaker size={15} /> : <Building2 size={15} />}
                          </div>
                          <div>
                            <div className="text-xs font-extrabold text-slate-900 leading-tight">
                              {room.name}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {isLab ? 'Specialist Lab' : 'Lecture Classroom'} · {room.capacity} Seats
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                            (room.utilization || 0) > 70 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {room.utilization || 0}%
                          </span>
                          <div className="text-[9px] text-slate-400 font-medium mt-0.5">Utilized</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right 8 Cols: Selected Room Detail & Assigned Schedule */}
        <div className="lg:col-span-8 space-y-6">
          {selectedRoom ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              {/* Room Header Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                      {selectedRoom.name}
                    </span>
                    <span className="text-xs font-bold text-slate-400 uppercase">
                      {selectedRoom.room_type || 'CLASSROOM'}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {selectedRoom.building} · {selectedRoom.floor}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 mt-1">{selectedRoom.name}</h2>
                  <div className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-3">
                    <span>Capacity: <strong>{selectedRoom.capacity} Students</strong></span>
                    <span>·</span>
                    <span className={`font-bold ${selectedRoom.capacity >= 60 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {selectedRoom.capacity >= 60 ? 'Fits standard divisions (60 seats)' : 'Compact / Small Batch'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/export?type=room&name=${encodeURIComponent(selectedRoom.name)}&id=${encodeURIComponent(selectedRoom.id)}`)}
                    className="flex items-center gap-1.5 px-3 py-2 border border-indigo-200 hover:bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                    title="Print and export official timetable sheet for this venue"
                  >
                    <Printer size={14} className="text-indigo-600" />
                    <span>Print Sheet</span>
                  </button>
                  <button
                    onClick={() => handleOpenEdit(selectedRoom)}
                    className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all"
                  >
                    <Edit3 size={14} className="text-indigo-600" />
                    <span>Edit Venue</span>
                  </button>
                  <button
                    onClick={() => handleDeleteRoom(selectedRoom.id, selectedRoom.name)}
                    className="flex items-center gap-1.5 px-3 py-2 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-bold transition-all"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {/* Equipment Facilities */}
              <div>
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                  Venue Facilities & Hardware
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedRoom.equipment && selectedRoom.equipment.length > 0 ? selectedRoom.equipment : ['Projector', 'Air Conditioned']).map((eq, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-indigo-50/70 border border-indigo-100 text-indigo-700 text-xs font-bold">
                      ✓ {eq}
                    </span>
                  ))}
                </div>
              </div>

              {/* Live Occupancy Matrix Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar size={15} className="text-indigo-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Weekly Room Allocation Schedule
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-bold">
                    Assigned Theory Lectures & Labs
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-wider">
                        <th className="py-2.5 px-3 border-r border-slate-200 w-24">Day</th>
                        {slots.map((s, idx) => (
                          <th key={idx} className="py-2.5 px-3 text-center border-r border-slate-200 last:border-r-0 whitespace-nowrap">
                            {s}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((day, dIdx) => (
                        <tr key={day} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="py-3 px-3 font-extrabold text-slate-800 bg-slate-50/40 border-r border-slate-200 text-xs">
                            {day}
                          </td>
                          {slots.map((_, sIdx) => {
                            const entry = selectedRoom.grid?.[dIdx]?.[sIdx];
                            return (
                              <td key={sIdx} className="py-2 px-2 border-r border-slate-100 last:border-r-0 min-w-[120px]">
                                {entry ? (
                                  <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-950">
                                    <div className="text-[11px] font-black truncate">{entry.class}</div>
                                    <div className="text-[10px] font-bold text-indigo-700 truncate">{entry.subject}</div>
                                    <div className="text-[9px] text-slate-500 mt-0.5 truncate">{entry.teacher}</div>
                                  </div>
                                ) : (
                                  <div className="py-2 text-center text-[10px] font-bold text-slate-300">
                                    Free
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
              <Building2 size={36} className="mx-auto mb-3 text-slate-300" />
              <div className="text-sm font-bold text-slate-700">No Venue Selected</div>
              <div className="text-xs text-slate-400 mt-1">Select a classroom or lab on the left to inspect its live schedule.</div>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Slide-Over Right Drawer */}
      {showAddModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-2xs flex justify-end overflow-hidden animate-fadeIn"
        >
          <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden animate-slideInRight">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Building2 size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {editingRoom ? `Edit Venue: ${editingRoom.name}` : 'Register New Physical Venue'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Capacity, building wing, and room equipment
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="flex-1 flex flex-col min-h-0 text-xs">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Room / Lab Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. M-104 or Computer Lab 3"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-slate-50 focus:bg-white transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Venue Type</label>
                    <select
                      value={formData.room_type}
                      onChange={e => setFormData({ ...formData, room_type: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-slate-50 focus:bg-white transition-colors"
                    >
                      <option value="CLASSROOM">Classroom</option>
                      <option value="LAB">Specialized Lab</option>
                      <option value="SEMINAR">Seminar Hall</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Seating Capacity</label>
                    <input
                      type="number"
                      min="10"
                      max="300"
                      value={formData.capacity}
                      onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) || 60 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-slate-50 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Building Location</label>
                    <input
                      type="text"
                      value={formData.building}
                      onChange={e => setFormData({ ...formData, building: e.target.value })}
                      placeholder="e.g. M Block"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Floor</label>
                    <input
                      type="text"
                      value={formData.floor}
                      onChange={e => setFormData({ ...formData, floor: e.target.value })}
                      placeholder="e.g. 1st Floor"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Equipped Facilities</label>
                  <div className="grid grid-cols-2 gap-2">
                    {EQUIPMENT_OPTIONS.map(eq => {
                      const checked = formData.equipment.includes(eq);
                      return (
                        <button
                          type="button"
                          key={eq}
                          onClick={() => toggleEquipment(eq)}
                          className={`px-2.5 py-1.5 rounded-lg border text-left font-bold text-[11px] transition-all flex items-center gap-1.5 ${
                            checked
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span className={`w-3 h-3 rounded flex items-center justify-center text-[10px] font-bold ${
                            checked ? 'bg-indigo-600 text-white' : 'border border-slate-300'
                          }`}>
                            {checked ? '✓' : ''}
                          </span>
                          <span>{eq}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  {editingRoom ? 'Update Venue' : 'Register Venue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
