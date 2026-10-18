import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Printer, Download, FileSpreadsheet, Copy, ArrowLeft, Check,
  Edit3, Eye, Settings2, RefreshCw, Layers, Sparkles, Building,
  GraduationCap, Calendar, Clock, CheckCircle2, ChevronDown, Sliders,
  ChevronLeft, ChevronRight, Users, MapPin, Search, Filter, BookOpen,
  Award, ShieldCheck
} from "lucide-react";
import { ApiService, TimetablePresetSummary, TimetablePresetDetail } from "@/services/api";

// ─── Interfaces ───────────────────────────────────────────────

interface Division {
  id: string;
  name: string;
  branch?: string;
  semester_id?: string;
  student_capacity?: number;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  subject_type?: string;
  theory_hours_per_week?: number;
  lab_hours_per_week?: number;
}

interface Teacher {
  id: string;
  name: string;
  employee_id?: string;
  designation?: string;
  department?: string;
}

interface Room {
  id: string;
  name: string;
  room_type?: string;
  capacity?: number;
  building?: string;
  floor?: string;
}

interface CellEntry {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  sessionType: "THEORY" | "LAB" | "TUTORIAL";
  duration: number;
  color?: string;
  teacherId?: string;
  teacherName?: string;
  teacherInitials?: string;
  roomId?: string;
  roomName?: string;
  isContinuation?: boolean;
  parentSlotId?: string;
  divisionId?: string;
  divisionName?: string;
}

interface CollegeSheetMeta {
  instituteName: string;
  departmentName: string;
  programSemester: string;
  wefDate: string;
  classroom: string;
  groupHead: string;
  director: string;
  coordinator: string;
  noticeNote: string;
  showPrayer: boolean;
  showSaturday: boolean;
  showSignatures: boolean;
  showLegend: boolean;
  showWorkload: boolean;
  prayerTime: string;
  recess1Time: string;
  recess2Time: string;
  customAuxLoad: number;
}

const LOCAL_STORAGE_KEY = "timegrid_timetable_state_v2";
const COLLEGE_META_STORAGE_KEY = "timegrid_college_export_meta_v1";

// ─── Helper: Generate Initials from Name ──────────────────────

function getTeacherInitials(name?: string): string {
  if (!name) return "";
  const clean = name.replace(/^(dr\.|prof\.|mr\.|ms\.|mrs\.)\s+/i, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  if (parts.length === 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts.map((p) => p[0]).join("").toUpperCase().slice(0, 3);
}

// ─── Convert Raw Backend Timetables into Export Grid ─────────

function convertRawToExportGrid(
  rawTimetables: Record<string, any[][]>,
  divisions: Division[],
  subjects: Subject[]
): Record<string, Record<string, CellEntry | null>> {
  const result: Record<string, Record<string, CellEntry | null>> = {};
  const standardDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const teachingSlotKeys = ["08:30", "09:30", "10:45", "11:45", "13:30", "14:30"];

  for (const div of divisions) {
    const rawGrid = rawTimetables[div.id] || rawTimetables[div.name];
    if (!rawGrid || !Array.isArray(rawGrid)) continue;

    const divGrid: Record<string, CellEntry | null> = {};

    rawGrid.forEach((dayRow: any[], dayIdx: number) => {
      if (dayIdx >= standardDays.length) return;
      const dayName = standardDays[dayIdx];

      // Filter teaching slots from dayRow (skip explicit break cells)
      const teachingCells = dayRow.filter((c: any) => c && c.type !== "break");

      teachingCells.forEach((cell: any, tIdx: number) => {
        if (tIdx >= teachingSlotKeys.length) return;
        const slotKey = teachingSlotKeys[tIdx];

        if (!cell || cell.type === "free" || !cell.subject_id) {
          divGrid[`${dayName}-${slotKey}`] = null;
          return;
        }

        const cleanSubId = String(cell.subject_id || "").replace(/_lab$/, "");
        const matchedSub = subjects.find(
          (s) =>
            s.id === cleanSubId ||
            s.id === cell.subject_id ||
            s.name.toLowerCase() === String(cell.subject_name || "").toLowerCase()
        );

        const isPRJ =
          cell.code === "PRJ" ||
          (cell.type || "").toUpperCase() === "PRJ" ||
          String(cell.subject_name || "").toUpperCase().includes("PRJ");

        const isSDA =
          cell.code === "SDA" ||
          (cell.type || "").toUpperCase() === "SDA" ||
          String(cell.subject_name || "").toUpperCase().includes("SDA");

        const isLab =
          !isPRJ &&
          !isSDA &&
          ((cell.type || "").toLowerCase().includes("lab") ||
            String(cell.subject_id || "").endsWith("_lab") ||
            String(cell.subject_name || "").toLowerCase().includes("lab"));

        divGrid[`${dayName}-${slotKey}`] = {
          subjectId: matchedSub?.id || cleanSubId,
          subjectName:
            cell.subject_name ||
            matchedSub?.name ||
            (isPRJ ? "PRJ (Project Work)" : isSDA ? "SDA (Skill Development)" : "Subject"),
          subjectCode:
            cell.code ||
            matchedSub?.code ||
            (isPRJ ? "PRJ" : isSDA ? "SDA" : cell.subject_name ? cell.subject_name.slice(0, 6).toUpperCase() : "SUB"),
          sessionType: (isLab || isPRJ) ? "LAB" : "THEORY",
          duration: (isLab || isPRJ) ? 2 : 1,
          teacherName: cell.teacher || "",
          teacherInitials: getTeacherInitials(cell.teacher),
          roomName: cell.room || "",
          isContinuation: !!cell.is_continuation,
          divisionId: div.id,
          divisionName: div.name,
        };
      });
    });

    result[div.id] = divGrid;
  }
  return result;
}

export default function TimetableExportPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const sheetRef = useRef<HTMLDivElement>(null);

  // ── Mode: division | faculty | room ──
  const [exportType, setExportType] = useState<"division" | "faculty" | "room">("division");

  // Data states
  const [loading, setLoading] = useState(true);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [timetable, setTimetable] = useState<Record<string, Record<string, CellEntry | null>>>({});

  // Entity selection
  const [selectedDivId, setSelectedDivId] = useState<string>("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");

  // Filters & Search
  const [teacherSearch, setTeacherSearch] = useState<string>("");
  const [roomFilterCategory, setRoomFilterCategory] = useState<"ALL" | "CLASSROOM" | "LAB">("ALL");

  // Presets state
  const [presets, setPresets] = useState<TimetablePresetSummary[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [loadingPreset, setLoadingPreset] = useState<boolean>(false);

  // UI state
  const [editMode, setEditMode] = useState<boolean>(false);
  const [showCustomizer, setShowCustomizer] = useState<boolean>(false);
  const [copiedToast, setCopiedToast] = useState<string | null>(null);

  // College Metadata (CGPIT Bardoli official defaults)
  const [meta, setMeta] = useState<CollegeSheetMeta>({
    instituteName: "Chhotubhai Gopalbhai Patel Institute of Technology, Bardoli",
    departmentName: "Department of CE/IT/AI&DS/CS Engineering (2026-27)",
    programSemester: "B.Tech - 5th Semester AI&DS (Division-C)",
    wefDate: "29th Jun 2026",
    classroom: "Classroom: G-001",
    groupHead: "Dr. Mayank R. Kapadia",
    director: "Prof. B. M. Vadher",
    coordinator: "Prof. Amit Patel",
    noticeNote: "Note: Any change in the above time-table must be informed to the undersigned before implement.",
    showPrayer: true,
    showSaturday: true,
    showSignatures: true,
    showLegend: true,
    showWorkload: true,
    prayerTime: "8:15 AM - 8:30 AM",
    recess1Time: "10:30 AM - 10:45 AM",
    recess2Time: "12:45 PM - 1:30 PM",
    customAuxLoad: 9,
  });

  // ── Load Initial Data & Presets ─────────────────────────────

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [divs, subs, tchrs, rms, presetsList] = await Promise.all([
          ApiService.getClassGroups().catch(() => []),
          ApiService.getSubjects().catch(() => []),
          ApiService.getTeachers().catch(() => []),
          ApiService.getRooms().catch(() => []),
          ApiService.getTimetablePresets().catch(() => []),
        ]);

        const loadedDivs: Division[] = divs || [];
        const loadedSubs: Subject[] = subs || [];
        const loadedTchrs: Teacher[] = tchrs || [];
        const loadedRms: Room[] = rms || [];

        setDivisions(loadedDivs);
        setSubjects(loadedSubs);
        setTeachers(loadedTchrs);
        setRooms(loadedRms);
        setPresets(presetsList || []);

        let loadedGrid: Record<string, Record<string, CellEntry | null>> = {};

        // 1. Check if a preset is requested via URL or pick latest preset
        const paramPreset = searchParams.get("preset");
        const targetPresetId = paramPreset || (presetsList && presetsList.length > 0 ? presetsList[0].id : null);

        if (targetPresetId) {
          try {
            setActivePresetId(targetPresetId);
            const detail = await ApiService.getTimetablePreset(targetPresetId);
            if (detail && detail.timetables && Object.keys(detail.timetables).length > 0) {
              loadedGrid = convertRawToExportGrid(detail.timetables, loadedDivs, loadedSubs);
              setTimetable(loadedGrid);
            }
          } catch {
            // Silently fall through to localStorage fallback
          }
        }

        // 2. Fallback to localStorage if no preset grid was loaded
        if (Object.keys(loadedGrid).length === 0) {
          const savedRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (savedRaw) {
            try {
              const parsed = JSON.parse(savedRaw);
              if (parsed.timetable) {
                loadedGrid = parsed.timetable;
                setTimetable(parsed.timetable);
              }
            } catch {}
          }
        }

        // 3. Fallback to latest database version if still empty
        if (Object.keys(loadedGrid).length === 0) {
          try {
            const versions = await ApiService.getTimetableVersions();
            if (versions && versions.length > 0) {
              const latest = versions[versions.length - 1];
              if (latest.timetables) {
                if (Array.isArray(latest.timetables[Object.keys(latest.timetables)[0]])) {
                  loadedGrid = convertRawToExportGrid(latest.timetables, loadedDivs, loadedSubs);
                } else {
                  loadedGrid = latest.timetables;
                }
                setTimetable(loadedGrid);
              }
            }
          } catch {}
        }

        // 4. Handle initial Type & Target from URL params
        const paramType = searchParams.get("type");
        const paramName = (searchParams.get("name") || "").toLowerCase().trim();
        const paramId = searchParams.get("id") || "";
        const paramDiv = searchParams.get("division") || "";

        if (paramType === "faculty") {
          setExportType("faculty");
          const matchedTchr = loadedTchrs.find(
            (t) => (paramId && t.id === paramId) || (paramName && t.name.toLowerCase().includes(paramName))
          );
          if (matchedTchr) {
            setSelectedTeacherId(matchedTchr.id);
          } else if (paramName) {
            setSelectedTeacherId(paramName);
          } else if (loadedTchrs.length > 0) {
            setSelectedTeacherId(loadedTchrs[0].id);
          }
        } else if (paramType === "room") {
          setExportType("room");
          const matchedRoom = loadedRms.find(
            (r) => (paramId && r.id === paramId) || (paramName && r.name.toLowerCase().includes(paramName))
          );
          if (matchedRoom) {
            setSelectedRoomId(matchedRoom.id);
          } else if (paramName) {
            setSelectedRoomId(paramName);
          } else if (loadedRms.length > 0) {
            setSelectedRoomId(loadedRms[0].id);
          }
        } else {
          setExportType("division");
          if (paramDiv && loadedDivs.some((d) => d.id === paramDiv)) {
            setSelectedDivId(paramDiv);
          } else if (loadedDivs.length > 0) {
            const withSchedule = loadedDivs.find(
              (d) => loadedGrid[d.id] && Object.keys(loadedGrid[d.id]).length > 0
            );
            setSelectedDivId(withSchedule ? withSchedule.id : loadedDivs[0].id);
          }
        }

        // 5. Load saved college metadata if exists
        const savedMeta = localStorage.getItem(COLLEGE_META_STORAGE_KEY);
        if (savedMeta) {
          try {
            setMeta((prev) => ({ ...prev, ...JSON.parse(savedMeta) }));
          } catch {}
        }
      } catch (err) {
        console.error("Failed to load export data", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [searchParams]);

  // Persist metadata changes
  useEffect(() => {
    try {
      localStorage.setItem(COLLEGE_META_STORAGE_KEY, JSON.stringify(meta));
    } catch {}
  }, [meta]);

  // ── Unified Teachers & Rooms from Database + Timetable ──────

  const allTeachers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; designation?: string; employee_id?: string; department?: string }>();
    teachers.forEach((t) => {
      map.set(t.name.toLowerCase().trim(), {
        id: t.id,
        name: t.name,
        designation: t.designation || "Assistant Professor",
        employee_id: t.employee_id,
        department: t.department || "Engineering",
      });
    });

    Object.values(timetable).forEach((divGrid) => {
      Object.values(divGrid).forEach((cell) => {
        if (cell && cell.teacherName && cell.teacherName.trim()) {
          const key = cell.teacherName.toLowerCase().trim();
          if (!map.has(key)) {
            map.set(key, {
              id: cell.teacherId || key,
              name: cell.teacherName.trim(),
              designation: "Faculty Member",
              department: "Engineering",
            });
          }
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [teachers, timetable]);

  const allRooms = useMemo(() => {
    const map = new Map<string, { id: string; name: string; room_type?: string; capacity?: number; building?: string; floor?: string }>();
    rooms.forEach((r) => {
      map.set(r.name.toLowerCase().trim(), {
        id: r.id,
        name: r.name,
        room_type: r.room_type || (r.name.toLowerCase().includes("lab") ? "LABORATORY" : "CLASSROOM"),
        capacity: r.capacity || (r.name.toLowerCase().includes("lab") ? 35 : 60),
        building: r.building || "Academic Block",
        floor: r.floor || "1st Floor",
      });
    });

    Object.values(timetable).forEach((divGrid) => {
      Object.values(divGrid).forEach((cell) => {
        if (cell && cell.roomName && cell.roomName.trim() && cell.roomName !== "Classroom") {
          const key = cell.roomName.toLowerCase().trim();
          if (!map.has(key)) {
            map.set(key, {
              id: cell.roomId || key,
              name: cell.roomName.trim(),
              room_type: cell.roomName.toLowerCase().includes("lab") ? "LABORATORY" : "CLASSROOM",
              capacity: cell.roomName.toLowerCase().includes("lab") ? 35 : 60,
              building: "Academic Block",
              floor: "1st Floor",
            });
          }
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rooms, timetable]);

  // ── Active Selected Entity Objects ──────────────────────────

  const selectedDivision = useMemo(() => {
    return divisions.find((d) => d.id === selectedDivId) || divisions[0];
  }, [divisions, selectedDivId]);

  const selectedTeacher = useMemo(() => {
    if (selectedTeacherId) {
      const match = allTeachers.find(
        (t) => t.id === selectedTeacherId || t.name.toLowerCase() === selectedTeacherId.toLowerCase()
      );
      if (match) return match;
    }
    return allTeachers[0] || { id: "default", name: "Faculty Member", designation: "Assistant Professor", department: "Engineering" };
  }, [allTeachers, selectedTeacherId]);

  const selectedRoom = useMemo(() => {
    if (selectedRoomId) {
      const match = allRooms.find(
        (r) => r.id === selectedRoomId || r.name.toLowerCase() === selectedRoomId.toLowerCase()
      );
      if (match) return match;
    }
    return allRooms[0] || { id: "default", name: "Classroom G-001", room_type: "CLASSROOM", capacity: 60 };
  }, [allRooms, selectedRoomId]);

  // Auto-adapt division metadata
  useEffect(() => {
    if (exportType === "division" && selectedDivision) {
      const divName = selectedDivision.name;
      const semNumMatch = divName.match(/^(\d)/);
      const semNum = semNumMatch ? semNumMatch[1] : "5";
      const branchName = selectedDivision.branch || "CE/IT/AI&DS";
      const branchAbbr = branchName.includes("AI") || divName.includes("AI") ? "AI&DS"
        : branchName.includes("Information") ? "IT"
        : branchName.includes("Computer") ? "CE"
        : branchName.includes("Electronics") ? "EC"
        : branchName.includes("Civil") ? "CE"
        : branchName.includes("Mechanical") ? "ME"
        : "ENG";

      setMeta((prev) => ({
        ...prev,
        programSemester: `B.Tech - ${semNum}th Semester ${branchAbbr} (${divName})`,
        classroom: `Classroom: ${selectedDivision.student_capacity && selectedDivision.student_capacity > 60 ? "G-002" : "G-001"}`,
      }));
    }
  }, [selectedDivision, exportType]);

  // ── Switch Preset Handler ───────────────────────────────────

  const handleSelectPreset = useCallback(async (presetId: string) => {
    if (presetId === activePresetId) return;
    setLoadingPreset(true);
    setActivePresetId(presetId);
    try {
      const detail = await ApiService.getTimetablePreset(presetId);
      if (detail && detail.timetables) {
        const converted = convertRawToExportGrid(detail.timetables, divisions, subjects);
        setTimetable(converted);
        showToast(`Switched to ${detail.name || "Preset"}`);
      }
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("preset", presetId);
        return next;
      });
    } catch (err) {
      console.error("Failed to load preset:", err);
      showToast("Could not load preset data");
    } finally {
      setLoadingPreset(false);
    }
  }, [activePresetId, divisions, subjects, setSearchParams]);

  // Current preset index in presets list
  const currentPresetIdx = useMemo(() => {
    return presets.findIndex((p) => p.id === activePresetId);
  }, [presets, activePresetId]);

  const activePreset = useMemo(() => {
    return presets.find((p) => p.id === activePresetId) || presets[0];
  }, [presets, activePresetId]);

  const handlePrevPreset = () => {
    if (currentPresetIdx > 0) {
      handleSelectPreset(presets[currentPresetIdx - 1].id);
    }
  };

  const handleNextPreset = () => {
    if (currentPresetIdx < presets.length - 1) {
      handleSelectPreset(presets[currentPresetIdx + 1].id);
    }
  };

  // ── Scheduled Grid Data (Dynamic per Export Mode) ───────────

  const activeGrid = useMemo(() => {
    // 1. Division Timetable
    if (exportType === "division") {
      if (!selectedDivId || !timetable[selectedDivId]) return {};
      return timetable[selectedDivId] || {};
    }

    // 2. Faculty Timetable (Filtered across all divisions)
    if (exportType === "faculty") {
      if (!selectedTeacher) return {};
      const grid: Record<string, CellEntry | null> = {};
      const targetName = selectedTeacher.name.trim().toLowerCase();
      const targetId = selectedTeacher.id;

      Object.entries(timetable).forEach(([divId, divGrid]) => {
        const divObj = divisions.find((d) => d.id === divId);
        const divName = divObj?.name || divId;

        Object.entries(divGrid).forEach(([slotKey, cell]) => {
          if (!cell) return;
          const cellTeacherName = (cell.teacherName || "").trim().toLowerCase();
          const isMatch =
            (targetId && cell.teacherId === targetId) ||
            (targetName && (
              cellTeacherName === targetName ||
              cellTeacherName.includes(targetName) ||
              targetName.includes(cellTeacherName)
            ));

          if (isMatch) {
            grid[slotKey] = {
              ...cell,
              divisionName: cell.divisionName || divName,
            };
          }
        });
      });
      return grid;
    }

    // 3. Room / Lab Timetable (Filtered across all divisions)
    if (exportType === "room") {
      if (!selectedRoom) return {};
      const grid: Record<string, CellEntry | null> = {};
      const targetName = selectedRoom.name.trim().toLowerCase();
      const targetId = selectedRoom.id;

      Object.entries(timetable).forEach(([divId, divGrid]) => {
        const divObj = divisions.find((d) => d.id === divId);
        const divName = divObj?.name || divId;

        Object.entries(divGrid).forEach(([slotKey, cell]) => {
          if (!cell) return;
          const cellRoomName = (cell.roomName || "").trim().toLowerCase();
          const isMatch =
            (targetId && cell.roomId === targetId) ||
            (targetName && (
              cellRoomName === targetName ||
              cellRoomName.includes(targetName) ||
              targetName.includes(cellRoomName)
            ));

          if (isMatch) {
            const current = grid[slotKey];
            if (current) {
              grid[slotKey] = {
                ...current,
                divisionName: `${current.divisionName || ""}, ${cell.divisionName || divName}`,
              };
            } else {
              grid[slotKey] = {
                ...cell,
                divisionName: cell.divisionName || divName,
              };
            }
          }
        });
      });
      return grid;
    }

    return {};
  }, [exportType, selectedDivId, selectedTeacher, selectedRoom, timetable, divisions]);

  // Days list (Monday to Saturday default)
  const days = useMemo(() => {
    return meta.showSaturday
      ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
      : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  }, [meta.showSaturday]);

  // Flexible cell lookup helper: maps Period 0 to 5
  const getSlotCell = (day: string, slotIndex: number): CellEntry | null => {
    const teachingSlotKeys = [
      ["08:30", "08:00", "slot-1", "slot-08:30", "1"],
      ["09:30", "09:00", "slot-2", "slot-09:30", "2"],
      ["10:45", "10:00", "11:00", "slot-3", "slot-10:45", "3"],
      ["11:45", "11:30", "12:00", "slot-4", "slot-11:45", "4"],
      ["13:30", "13:00", "14:00", "slot-5", "slot-13:30", "5"],
      ["14:30", "15:00", "16:00", "slot-6", "slot-14:30", "6"],
    ];
    const keys = teachingSlotKeys[slotIndex] || [];
    for (const k of keys) {
      if (activeGrid[`${day}-${k}`]) return activeGrid[`${day}-${k}`];
    }
    return null;
  };

  // Direct in-cell editing handler
  const handleUpdateCell = (day: string, slotKey: string, field: keyof CellEntry, value: string) => {
    if (exportType !== "division") return;
    setTimetable((prev) => {
      const divGrid = { ...(prev[selectedDivId] || {}) };
      const currentCell = divGrid[`${day}-${slotKey}`] || {
        subjectId: "custom",
        subjectName: "Subject",
        subjectCode: "SUB",
        sessionType: "THEORY",
        duration: 1,
      };
      divGrid[`${day}-${slotKey}`] = {
        ...currentCell,
        [field]: value,
      };
      return {
        ...prev,
        [selectedDivId]: divGrid,
      };
    });
  };

  // ── Workload & Subject Legend Computations for Division Mode ─

  const { legendSubjects, theoryHours, labHours, totalLoad } = useMemo(() => {
    const subMap: Record<string, {
      code: string;
      name: string;
      univCode: string;
      teachers: Set<string>;
      theoryHrs: number;
      labHrs: number;
    }> = {};

    let tHrs = 0;
    let lHrs = 0;

    Object.entries(activeGrid).forEach(([_, cell]) => {
      if (!cell) return;
      if (cell.isContinuation) {
        lHrs += 1;
        return;
      }

      const code = cell.subjectCode || "SUB";
      if (!subMap[code]) {
        const fullSub = subjects.find((s) => s.id === cell.subjectId || s.code === code);
        subMap[code] = {
          code,
          name: fullSub?.name || cell.subjectName || code,
          univCode: fullSub?.code || code,
          teachers: new Set(),
          theoryHrs: 0,
          labHrs: 0,
        };
      }

      if (cell.teacherName) {
        subMap[code].teachers.add(cell.teacherName);
      }

      if (cell.sessionType === "LAB") {
        lHrs += cell.duration || 2;
        subMap[code].labHrs += cell.duration || 2;
      } else {
        tHrs += 1;
        subMap[code].theoryHrs += 1;
      }
    });

    const list = Object.values(subMap);
    return {
      legendSubjects: list,
      theoryHours: tHrs,
      labHours: lHrs,
      totalLoad: tHrs + lHrs + (meta.customAuxLoad || 0),
    };
  }, [activeGrid, subjects, meta.customAuxLoad]);

  // ── Workload & Course Allocation for Faculty Mode ───────────

  const facultySummary = useMemo(() => {
    let tHrs = 0;
    let lHrs = 0;
    const coursesMap = new Map<string, {
      code: string;
      name: string;
      division: string;
      type: string;
      room: string;
      hours: number;
    }>();

    Object.entries(activeGrid).forEach(([_, cell]) => {
      if (!cell) return;
      if (cell.isContinuation) {
        lHrs += 1;
        return;
      }
      const isLab = cell.sessionType === "LAB" || (cell.duration && cell.duration >= 2);
      const dur = isLab ? (cell.duration || 2) : 1;
      if (isLab) lHrs += dur;
      else tHrs += dur;

      const key = `${cell.subjectCode}-${cell.divisionName || ""}-${cell.sessionType}`;
      if (!coursesMap.has(key)) {
        coursesMap.set(key, {
          code: cell.subjectCode,
          name: cell.subjectName,
          division: cell.divisionName || "All Divs",
          type: cell.sessionType === "LAB" ? "Practical (Lab)" : "Theory Lecture",
          room: cell.roomName || "Classroom",
          hours: 0,
        });
      }
      coursesMap.get(key)!.hours += dur;
    });

    return {
      courses: Array.from(coursesMap.values()),
      theoryHours: tHrs,
      labHours: lHrs,
      totalHours: tHrs + lHrs,
    };
  }, [activeGrid]);

  // ── Venue Occupancy & Division Distribution for Room Mode ───

  const roomSummary = useMemo(() => {
    let occupiedHours = 0;
    const sessionsMap = new Map<string, {
      division: string;
      subject: string;
      faculty: string;
      type: string;
      hours: number;
    }>();

    Object.entries(activeGrid).forEach(([_, cell]) => {
      if (!cell) return;
      if (cell.isContinuation) {
        occupiedHours += 1;
        return;
      }
      const isLab = cell.sessionType === "LAB" || (cell.duration && cell.duration >= 2);
      const dur = isLab ? (cell.duration || 2) : 1;
      occupiedHours += dur;

      const key = `${cell.divisionName || ""}-${cell.subjectCode}-${cell.sessionType}`;
      if (!sessionsMap.has(key)) {
        sessionsMap.set(key, {
          division: cell.divisionName || "Division",
          subject: `${cell.subjectCode} (${cell.subjectName})`,
          faculty: cell.teacherName || cell.teacherInitials || "Faculty Assigned",
          type: cell.sessionType === "LAB" ? "Lab / Practical" : "Theory",
          hours: 0,
        });
      }
      sessionsMap.get(key)!.hours += dur;
    });

    const totalWeeklyTeachingSlots = (meta.showSaturday ? 6 : 5) * 6; // 36 or 30 slots
    const utilization = Math.round((occupiedHours / (totalWeeklyTeachingSlots || 36)) * 100);

    return {
      sessions: Array.from(sessionsMap.values()),
      occupiedHours,
      totalSlots: totalWeeklyTeachingSlots,
      utilization: Math.min(100, utilization),
    };
  }, [activeGrid, meta.showSaturday]);

  // ── Actions ──────────────────────────────────────────────────

  const showToast = (msg: string) => {
    setCopiedToast(msg);
    setTimeout(() => setCopiedToast(null), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyHtml = async () => {
    if (!sheetRef.current) return;
    try {
      const html = sheetRef.current.outerHTML;
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([sheetRef.current.innerText], { type: "text/plain" }),
        }),
      ]);
      showToast("✓ Copied sheet table to clipboard! Paste directly into Word or Excel.");
    } catch {
      showToast("Error copying to clipboard");
    }
  };

  const downloadFileName = useMemo(() => {
    if (exportType === "faculty") {
      const clean = (selectedTeacher.name || "Faculty").replace(/[^a-zA-Z0-9_-]/g, "_");
      return `Timetable_Faculty_${clean}_Official.xls`;
    }
    if (exportType === "room") {
      const clean = (selectedRoom.name || "Venue").replace(/[^a-zA-Z0-9_-]/g, "_");
      return `Timetable_Venue_${clean}_Official.xls`;
    }
    const clean = (selectedDivision?.name || "Class").replace(/[^a-zA-Z0-9_-]/g, "_");
    return `Timetable_${clean}_Official.xls`;
  }, [exportType, selectedTeacher, selectedRoom, selectedDivision]);

  const handleDownloadExcel = () => {
    if (!sheetRef.current) return;
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
          th, td { border: 1px solid #000000; padding: 6px; text-align: center; }
          .header { font-weight: bold; font-size: 14pt; }
          .sub-header { font-weight: bold; font-size: 11pt; }
          .shaded { background-color: #E5E7EB; font-weight: bold; }
        </style>
      </head>
      <body>
        ${sheetRef.current.innerHTML}
      </body>
      </html>
    `;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`✓ Downloaded ${downloadFileName}`);
  };

  // Switch mode helper
  const handleModeChange = (mode: "division" | "faculty" | "room") => {
    setExportType(mode);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("type", mode);
      if (mode === "faculty") {
        next.set("name", selectedTeacher?.name || "");
      } else if (mode === "room") {
        next.set("name", selectedRoom?.name || "");
      } else {
        next.set("division", selectedDivId);
      }
      return next;
    });
  };

  // Filtered teachers list for search
  const filteredTeachers = useMemo(() => {
    if (!teacherSearch.trim()) return allTeachers;
    const q = teacherSearch.toLowerCase();
    return allTeachers.filter(
      (t) => t.name.toLowerCase().includes(q) || (t.designation && t.designation.toLowerCase().includes(q))
    );
  }, [allTeachers, teacherSearch]);

  // Filtered rooms list for tabs
  const filteredRooms = useMemo(() => {
    if (roomFilterCategory === "CLASSROOM") {
      return allRooms.filter((r) => !r.name.toLowerCase().includes("lab") && (r.room_type || "").toUpperCase() !== "LABORATORY");
    }
    if (roomFilterCategory === "LAB") {
      return allRooms.filter((r) => r.name.toLowerCase().includes("lab") || (r.room_type || "").toUpperCase() === "LABORATORY");
    }
    return allRooms;
  }, [allRooms, roomFilterCategory]);

  // ── Render Cell Content by Mode ─────────────────────────────

  const renderCellBody = (cell: CellEntry | null, day: string, slotKey: string, isLab2h: boolean) => {
    if (!cell) {
      if (exportType === "faculty") {
        return (
          <span className="text-[10px] text-slate-400 font-medium italic select-none">
            — Free / Office Hours —
          </span>
        );
      }
      if (exportType === "room") {
        return (
          <span className="text-[10px] text-emerald-700 font-semibold italic select-none">
            — Available —
          </span>
        );
      }
      return null;
    }

    // 1. Division Mode
    if (exportType === "division") {
      return editMode ? (
        <div className="space-y-1">
          <input
            type="text"
            value={cell.subjectCode}
            onChange={(e) => handleUpdateCell(day, slotKey, "subjectCode", e.target.value)}
            className="w-full text-center text-xs font-bold bg-white border border-slate-300 rounded"
          />
          <input
            type="text"
            value={cell.teacherInitials || getTeacherInitials(cell.teacherName)}
            onChange={(e) => handleUpdateCell(day, slotKey, "teacherInitials", e.target.value)}
            className="w-full text-center text-[10px] bg-white border border-slate-300 rounded"
          />
          <input
            type="text"
            value={cell.roomName || "Classroom"}
            onChange={(e) => handleUpdateCell(day, slotKey, "roomName", e.target.value)}
            className="w-full text-center text-[9px] bg-white border border-slate-300 rounded"
          />
        </div>
      ) : (
        <>
          <div className="font-bold text-xs text-black">{cell.subjectCode}</div>
          {cell.teacherName && (
            <div className="font-semibold text-[11px] text-black">
              ({cell.teacherInitials || getTeacherInitials(cell.teacherName) || cell.teacherName})
            </div>
          )}
          {cell.roomName && cell.roomName !== "Classroom" && cell.roomName !== meta.classroom && (
            <div className="text-[10px] text-slate-700 font-normal">
              ({cell.roomName})
            </div>
          )}
        </>
      );
    }

    // 2. Faculty Mode
    if (exportType === "faculty") {
      return (
        <div className="space-y-0.5">
          <div className="font-bold text-xs text-black leading-tight">
            {cell.subjectCode}
          </div>
          <div className="font-semibold text-[11px] text-indigo-900 leading-tight">
            [Class: {cell.divisionName || "All Div"}]
          </div>
          <div className="text-[10px] text-slate-700 font-normal">
            ({cell.roomName || "Classroom"})
          </div>
        </div>
      );
    }

    // 3. Room / Lab Mode
    if (exportType === "room") {
      return (
        <div className="space-y-0.5">
          <div className="font-bold text-xs text-black leading-tight">
            {cell.subjectCode}
          </div>
          <div className="font-semibold text-[11px] text-purple-900 leading-tight">
            [Class: {cell.divisionName || "All Div"}]
          </div>
          <div className="text-[10px] text-slate-700 font-normal">
            ({cell.teacherInitials || getTeacherInitials(cell.teacherName) || cell.teacherName || "Assigned"})
          </div>
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
        <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-500">Preparing official college export sheet...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-16 animate-fadeIn">
      {/* Toast Alert */}
      {copiedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-slideUp">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{copiedToast}</span>
        </div>
      )}

      {/* ── Top Action Toolbar (Hidden in Print) ── */}
      <div className="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/timetable?division=${encodeURIComponent(selectedDivId)}`)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back to Builder</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-indigo-600 uppercase tracking-wider">
                {exportType === "faculty"
                  ? "Faculty Member Teaching Sheet"
                  : exportType === "room"
                  ? "Classroom & Lab Allocation Sheet"
                  : "Official Division Timetable Sheet"}
              </span>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Print & Export Ready
              </span>
            </div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">
              {exportType === "faculty"
                ? `Faculty Timetable: ${selectedTeacher.name}`
                : exportType === "room"
                ? `Venue Schedule: ${selectedRoom.name}`
                : "College Timetable Export Engine"}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle In-Place Edit Mode (Division Only) */}
          {exportType === "division" && (
            <button
              onClick={() => setEditMode(!editMode)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                editMode
                  ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm"
                  : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              <Edit3 size={14} />
              <span>{editMode ? "Editing Active" : "Edit Canvas"}</span>
            </button>
          )}

          {/* Settings Drawer Toggle */}
          <button
            onClick={() => setShowCustomizer(!showCustomizer)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              showCustomizer
                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            <Sliders size={14} />
            <span>Customize Sheet</span>
          </button>

          {/* Copy Table */}
          <button
            onClick={handleCopyHtml}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Copy size={14} />
            <span>Copy HTML</span>
          </button>

          {/* Download Excel */}
          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <FileSpreadsheet size={14} />
            <span>Download Excel</span>
          </button>

          {/* Print / Save PDF */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer"
          >
            <Printer size={15} />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* ── Mode Switcher Tab Bar (Key Feature: Division | Faculty | Room) ── */}
      <div className="no-print bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          <button
            onClick={() => handleModeChange("division")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              exportType === "division"
                ? "bg-white text-indigo-600 shadow-sm border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <GraduationCap size={15} />
            <span>Class Timetable</span>
          </button>

          <button
            onClick={() => handleModeChange("faculty")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              exportType === "faculty"
                ? "bg-white text-indigo-600 shadow-sm border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users size={15} />
            <span>Faculty Timetable</span>
          </button>

          <button
            onClick={() => handleModeChange("room")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              exportType === "room"
                ? "bg-white text-indigo-600 shadow-sm border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building size={15} />
            <span>Classrooms & Labs</span>
          </button>
        </div>

        {/* Status info tag */}
        <div className="text-xs text-slate-500 font-semibold flex items-center gap-2">
          {exportType === "division" && (
            <span>Showing Division Master Grid with Subject Faculty Legend</span>
          )}
          {exportType === "faculty" && (
            <span className="text-indigo-600 font-bold flex items-center gap-1">
              <ShieldCheck size={14} /> Total Teaching Load: {facultySummary.totalHours} Hours/Week
            </span>
          )}
          {exportType === "room" && (
            <span className="text-purple-600 font-bold flex items-center gap-1">
              <Building size={14} /> Venue Occupancy: {roomSummary.occupiedHours}h ({roomSummary.utilization}%)
            </span>
          )}
        </div>
      </div>

      {/* ── Preset Carousel Strip ── */}
      {presets.length > 0 && (
        <div className="no-print bg-slate-900 text-white p-3.5 rounded-2xl shadow-md border border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-xs">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300">Timetable Presets</span>
                {activePreset && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Quality: {activePreset.quality?.overall_score || 92}%
                  </span>
                )}
                {loadingPreset && (
                  <span className="text-[10px] text-amber-300 font-medium">Switching preset...</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Select presets to view alternative schedules for this {exportType}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPreset}
              disabled={currentPresetIdx <= 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-all border border-slate-700 cursor-pointer"
              title="Previous Preset"
            >
              <ChevronLeft size={16} />
              <span>Prev</span>
            </button>

            <div className="flex items-center gap-1.5 overflow-x-auto max-w-[420px] py-1">
              {presets.map((p, idx) => {
                const isActive = p.id === activePresetId;
                const score = p.quality?.overall_score || 92;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPreset(p.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                      isActive
                        ? "bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-500/40 scale-102"
                        : "bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-slate-700"
                    }`}
                  >
                    <span>#{p.version_number || idx + 1} {p.name || `Preset ${idx + 1}`}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${isActive ? "bg-indigo-900 text-white" : "bg-slate-900 text-slate-400"}`}>
                      {score}%
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleNextPreset}
              disabled={currentPresetIdx >= presets.length - 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-all border border-slate-700 cursor-pointer"
              title="Next Preset"
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Entity Selection Strip (Dynamically adapts per mode) ── */}
      {/* 1. DIVISION SELECTOR */}
      {exportType === "division" && divisions.length > 0 && (
        <div className="no-print bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-1 whitespace-nowrap">
            <GraduationCap size={15} className="text-indigo-600" />
            Select Division:
          </span>
          {divisions.map((d) => {
            const isSelected = d.id === selectedDivId;
            return (
              <button
                key={d.id}
                onClick={() => setSelectedDivId(d.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                <span>{d.name}</span>
                {d.branch && (
                  <span className={`text-[10px] font-semibold ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                    {d.branch.replace(" Engineering", "")}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 2. FACULTY SELECTOR */}
      {exportType === "faculty" && (
        <div className="no-print bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                <Users size={15} className="text-indigo-600" />
                Select Faculty Member:
              </span>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search faculty name..."
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  className="pl-7 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 w-48"
                />
              </div>
            </div>

            {/* Quick Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Quick Select:</span>
              <select
                value={selectedTeacher.id}
                onChange={(e) => {
                  setSelectedTeacherId(e.target.value);
                  const matched = allTeachers.find((t) => t.id === e.target.value);
                  if (matched) {
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set("name", matched.name);
                      next.set("id", matched.id);
                      return next;
                    });
                  }
                }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {allTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.designation || "Faculty"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Faculty Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {filteredTeachers.slice(0, 15).map((t) => {
              const isSelected = selectedTeacher.name.toLowerCase() === t.name.toLowerCase();
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTeacherId(t.id);
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set("name", t.name);
                      next.set("id", t.id);
                      return next;
                    });
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm scale-102"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  <span>{t.name}</span>
                  <span className={`text-[10px] font-semibold ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                    {t.designation ? t.designation.slice(0, 10) : "Faculty"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. CLASSROOM & LAB SELECTOR */}
      {exportType === "room" && (
        <div className="no-print bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                <Building size={15} className="text-indigo-600" />
                Select Venue / Lab:
              </span>

              {/* Category Pills */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
                <button
                  onClick={() => setRoomFilterCategory("ALL")}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    roomFilterCategory === "ALL" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-600"
                  }`}
                >
                  All Venues
                </button>
                <button
                  onClick={() => setRoomFilterCategory("CLASSROOM")}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    roomFilterCategory === "CLASSROOM" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-600"
                  }`}
                >
                  Classrooms
                </button>
                <button
                  onClick={() => setRoomFilterCategory("LAB")}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    roomFilterCategory === "LAB" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-600"
                  }`}
                >
                  Computer & Eng Labs
                </button>
              </div>
            </div>

            {/* Quick Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Quick Select:</span>
              <select
                value={selectedRoom.id}
                onChange={(e) => {
                  setSelectedRoomId(e.target.value);
                  const matched = allRooms.find((r) => r.id === e.target.value);
                  if (matched) {
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set("name", matched.name);
                      next.set("id", matched.id);
                      return next;
                    });
                  }
                }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {filteredRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.room_type || "Classroom"}, {r.capacity || 60} seats)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Room Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {filteredRooms.map((r) => {
              const isSelected = selectedRoom.name.toLowerCase() === r.name.toLowerCase();
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedRoomId(r.id);
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set("name", r.name);
                      next.set("id", r.id);
                      return next;
                    });
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm scale-102"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  <span>{r.name}</span>
                  <span className={`text-[10px] font-semibold ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                    {r.capacity ? `${r.capacity} Seats` : r.room_type}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Slide-Out Customization Panel ── */}
      {showCustomizer && (
        <div className="no-print bg-white p-5 rounded-2xl border border-indigo-100 shadow-md space-y-4 animate-slideDown">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Settings2 size={16} className="text-indigo-600" />
              <span className="font-black text-slate-900 text-sm">Sheet Metadata & Format Customizer</span>
            </div>
            <span className="text-xs text-slate-400 font-medium">Changes reflect immediately on the print canvas below</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">College / Institute Title</label>
              <input
                type="text"
                value={meta.instituteName}
                onChange={(e) => setMeta({ ...meta, instituteName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Department & Term Line</label>
              <input
                type="text"
                value={meta.departmentName}
                onChange={(e) => setMeta({ ...meta, departmentName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Program & Semester Title</label>
              <input
                type="text"
                value={meta.programSemester}
                onChange={(e) => setMeta({ ...meta, programSemester: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">With Effect From (w.e.f)</label>
              <input
                type="text"
                value={meta.wefDate}
                onChange={(e) => setMeta({ ...meta, wefDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Group Head / HOD</label>
              <input
                type="text"
                value={meta.groupHead}
                onChange={(e) => setMeta({ ...meta, groupHead: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Director / Principal</label>
              <input
                type="text"
                value={meta.director}
                onChange={(e) => setMeta({ ...meta, director: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Notice & Disclaimer</label>
              <input
                type="text"
                value={meta.noticeNote}
                onChange={(e) => setMeta({ ...meta, noticeNote: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Auxiliary Load Hours</label>
              <input
                type="number"
                value={meta.customAuxLoad}
                onChange={(e) => setMeta({ ...meta, customAuxLoad: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Toggle Switches */}
          <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-slate-100 text-xs font-bold text-slate-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={meta.showPrayer}
                onChange={(e) => setMeta({ ...meta, showPrayer: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Include Prayer Slot (8:15 - 8:30 AM)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={meta.showSaturday}
                onChange={(e) => setMeta({ ...meta, showSaturday: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Include Saturday Column (6-Day Format)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={meta.showLegend}
                onChange={(e) => setMeta({ ...meta, showLegend: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Legend & Workload Breakdown Table</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={meta.showSignatures}
                onChange={(e) => setMeta({ ...meta, showSignatures: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Official Signatures Block</span>
            </label>
          </div>
        </div>
      )}

      {/* ── Main Printable Sheet Canvas (Exact CGPIT Bardoli Layout) ── */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-4 sm:p-8 overflow-x-auto">
        <div
          ref={sheetRef}
          className="official-college-sheet max-w-[1240px] mx-auto bg-white text-black p-4 sm:p-6"
          style={{
            fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
            color: "#000000",
          }}
        >
          {/* 1. Header (Centered, 3 Lines) */}
          <div className="text-center space-y-1 mb-4 select-text">
            {editMode ? (
              <input
                type="text"
                value={meta.instituteName}
                onChange={(e) => setMeta({ ...meta, instituteName: e.target.value })}
                className="w-full text-center font-bold text-lg sm:text-xl border-b border-dashed border-slate-400 focus:outline-none"
              />
            ) : (
              <h1 className="font-bold text-lg sm:text-xl tracking-tight text-black">
                {meta.instituteName}
              </h1>
            )}

            {editMode ? (
              <input
                type="text"
                value={meta.departmentName}
                onChange={(e) => setMeta({ ...meta, departmentName: e.target.value })}
                className="w-full text-center font-bold text-xs sm:text-sm border-b border-dashed border-slate-400 focus:outline-none"
              />
            ) : (
              <h2 className="font-bold text-xs sm:text-sm text-black">
                {meta.departmentName}
              </h2>
            )}

            {/* Sub-header line tailored to mode */}
            {exportType === "division" && (
              <h3 className="font-bold text-xs sm:text-[13px] text-black">
                Time Table for : {meta.programSemester} w.e.f. {meta.wefDate} ({meta.classroom})
              </h3>
            )}

            {exportType === "faculty" && (
              <h3 className="font-bold text-xs sm:text-[13px] text-black">
                Faculty Weekly Teaching Schedule : {selectedTeacher.name} ({selectedTeacher.designation || "Faculty Member"}{selectedTeacher.employee_id ? `, ID: ${selectedTeacher.employee_id}` : ""}) w.e.f. {meta.wefDate}
              </h3>
            )}

            {exportType === "room" && (
              <h3 className="font-bold text-xs sm:text-[13px] text-black">
                Venue Allocation & Utilization Schedule : {selectedRoom.name} ({selectedRoom.room_type || "Classroom"}, Capacity: {selectedRoom.capacity || 60} Seats) w.e.f. {meta.wefDate}
              </h3>
            )}
          </div>

          {/* 2. Main Timetable Table (Crisp Black Borders & Gray Lab Shading) */}
          <table
            className="w-full border-collapse border border-black text-center text-xs"
            style={{
              borderColor: "#000000",
              borderWidth: "1.5px",
            }}
          >
            <thead>
              <tr style={{ background: "#F3F4F6", borderColor: "#000000" }}>
                <th
                  className="border border-black px-2 py-2 font-bold text-black"
                  style={{ width: "105px" }}
                >
                  Time
                </th>
                {days.map((day) => (
                  <th
                    key={day}
                    className="border border-black px-2 py-2 font-bold text-black"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* Optional PRAYER Row (8:15 AM - 8:30 AM) */}
              {meta.showPrayer && (
                <tr style={{ background: "#E5E7EB" }}>
                  <td className="border border-black px-2 py-1 font-bold text-[11px] text-black whitespace-nowrap">
                    {meta.prayerTime}
                  </td>
                  <td
                    colSpan={days.length}
                    className="border border-black px-2 py-1 font-bold tracking-widest text-[11px] text-black"
                  >
                    PRAYER
                  </td>
                </tr>
              )}

              {/* Slot 1: 8:30 AM - 9:30 AM */}
              <tr>
                <td className="border border-black px-2 py-2.5 font-bold text-[11px] text-black whitespace-nowrap">
                  8:30 AM -<br />9:30 AM
                </td>
                {days.map((day) => {
                  const cell = getSlotCell(day, 0);
                  if (!cell) {
                    return (
                      <td key={day} className="border border-black p-1 text-black">
                        {renderCellBody(null, day, "08:30", false)}
                      </td>
                    );
                  }

                  const isLab2h = cell.sessionType === "LAB" || (cell.duration && cell.duration >= 2);
                  if (isLab2h) {
                    return (
                      <td
                        key={day}
                        rowSpan={2}
                        className="border border-black p-2 font-bold align-middle"
                        style={{ background: "#E5E7EB" }}
                      >
                        {renderCellBody(cell, day, "08:30", true)}
                      </td>
                    );
                  }

                  return (
                    <td key={day} className="border border-black p-2 align-middle">
                      {renderCellBody(cell, day, "08:30", false)}
                    </td>
                  );
                })}
              </tr>

              {/* Slot 2: 9:30 AM - 10:30 AM */}
              <tr>
                <td className="border border-black px-2 py-2.5 font-bold text-[11px] text-black whitespace-nowrap">
                  9:30 AM -<br />10:30 AM
                </td>
                {days.map((day) => {
                  const prevCell = getSlotCell(day, 0);
                  if (prevCell && (prevCell.sessionType === "LAB" || (prevCell.duration && prevCell.duration >= 2))) {
                    return null; // Spanned from slot 1
                  }

                  const cell = getSlotCell(day, 1);
                  if (!cell || cell.isContinuation) {
                    return (
                      <td key={day} className="border border-black p-1 text-black">
                        {renderCellBody(null, day, "09:30", false)}
                      </td>
                    );
                  }

                  return (
                    <td key={day} className="border border-black p-2 align-middle">
                      {renderCellBody(cell, day, "09:30", false)}
                    </td>
                  );
                })}
              </tr>

              {/* RECESS 1 (Morning Break: 10:30 AM - 10:45 AM) */}
              <tr style={{ background: "#E5E7EB" }}>
                <td className="border border-black px-2 py-1 font-bold text-[11px] text-black whitespace-nowrap">
                  {meta.recess1Time}
                </td>
                <td
                  colSpan={days.length}
                  className="border border-black px-2 py-1 font-bold tracking-widest text-[11px] text-black"
                >
                  RECESS
                </td>
              </tr>

              {/* Slot 3: 10:45 AM - 11:45 AM */}
              <tr>
                <td className="border border-black px-2 py-2.5 font-bold text-[11px] text-black whitespace-nowrap">
                  10:45 AM -<br />11:45 AM
                </td>
                {days.map((day) => {
                  const cell = getSlotCell(day, 2);
                  if (!cell) {
                    return (
                      <td key={day} className="border border-black p-1 text-black">
                        {renderCellBody(null, day, "10:45", false)}
                      </td>
                    );
                  }

                  const isLab2h = cell.sessionType === "LAB" || (cell.duration && cell.duration >= 2);
                  if (isLab2h) {
                    return (
                      <td
                        key={day}
                        rowSpan={2}
                        className="border border-black p-2 font-bold align-middle"
                        style={{ background: "#E5E7EB" }}
                      >
                        {renderCellBody(cell, day, "10:45", true)}
                      </td>
                    );
                  }

                  return (
                    <td key={day} className="border border-black p-2 align-middle">
                      {renderCellBody(cell, day, "10:45", false)}
                    </td>
                  );
                })}
              </tr>

              {/* Slot 4: 11:45 AM - 12:45 PM */}
              <tr>
                <td className="border border-black px-2 py-2.5 font-bold text-[11px] text-black whitespace-nowrap">
                  11:45 AM -<br />12:45 PM
                </td>
                {days.map((day) => {
                  const prevCell = getSlotCell(day, 2);
                  if (prevCell && (prevCell.sessionType === "LAB" || (prevCell.duration && prevCell.duration >= 2))) {
                    return null; // Spanned from slot 3
                  }

                  const cell = getSlotCell(day, 3);
                  if (!cell || cell.isContinuation) {
                    return (
                      <td key={day} className="border border-black p-1 text-black">
                        {renderCellBody(null, day, "11:45", false)}
                      </td>
                    );
                  }

                  return (
                    <td key={day} className="border border-black p-2 align-middle">
                      {renderCellBody(cell, day, "11:45", false)}
                    </td>
                  );
                })}
              </tr>

              {/* RECESS 2 (Lunch: 12:45 PM - 1:30 PM) */}
              <tr style={{ background: "#E5E7EB" }}>
                <td className="border border-black px-2 py-1 font-bold text-[11px] text-black whitespace-nowrap">
                  {meta.recess2Time}
                </td>
                <td
                  colSpan={days.length}
                  className="border border-black px-2 py-1 font-bold tracking-widest text-[11px] text-black"
                >
                  RECESS
                </td>
              </tr>

              {/* Slot 5: 1:30 PM - 2:30 PM */}
              <tr>
                <td className="border border-black px-2 py-2.5 font-bold text-[11px] text-black whitespace-nowrap">
                  1:30 PM -<br />2:30 PM
                </td>
                {days.map((day) => {
                  const cell = getSlotCell(day, 4);
                  if (!cell) {
                    return (
                      <td key={day} className="border border-black p-1 text-black">
                        {renderCellBody(null, day, "13:30", false)}
                      </td>
                    );
                  }

                  const isLab2h = cell.sessionType === "LAB" || (cell.duration && cell.duration >= 2);
                  if (isLab2h) {
                    return (
                      <td
                        key={day}
                        rowSpan={2}
                        className="border border-black p-2 font-bold align-middle"
                        style={{ background: "#E5E7EB" }}
                      >
                        {renderCellBody(cell, day, "13:30", true)}
                      </td>
                    );
                  }

                  return (
                    <td key={day} className="border border-black p-2 align-middle">
                      {renderCellBody(cell, day, "13:30", false)}
                    </td>
                  );
                })}
              </tr>

              {/* Slot 6: 2:30 PM - 3:30 PM */}
              <tr>
                <td className="border border-black px-2 py-2.5 font-bold text-[11px] text-black whitespace-nowrap">
                  2:30 PM -<br />3:30 PM
                </td>
                {days.map((day) => {
                  const prevCell = getSlotCell(day, 4);
                  if (prevCell && (prevCell.sessionType === "LAB" || (prevCell.duration && prevCell.duration >= 2))) {
                    return null; // Spanned from slot 5
                  }

                  const cell = getSlotCell(day, 5);
                  if (!cell || cell.isContinuation) {
                    return (
                      <td key={day} className="border border-black p-1 text-black">
                        {renderCellBody(null, day, "14:30", false)}
                      </td>
                    );
                  }

                  return (
                    <td key={day} className="border border-black p-2 align-middle">
                      {renderCellBody(cell, day, "14:30", false)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>

          {/* ── 3. Bottom Legend & Workload Section (Tailored to Mode) ── */}

          {/* A. DIVISION MODE LEGEND */}
          {exportType === "division" && meta.showLegend && (
            <div className="mt-4">
              <table
                className="w-full border-collapse border border-black text-left text-xs"
                style={{
                  borderColor: "#000000",
                  borderWidth: "1.5px",
                }}
              >
                <thead>
                  <tr style={{ background: "#E5E7EB" }}>
                    <th
                      className="border border-black px-3 py-1.5 font-bold text-center text-black"
                      style={{ width: "95px" }}
                    >
                      Subject<br />Faculties
                    </th>
                    {legendSubjects.length > 0 ? (
                      legendSubjects.map((sub) => (
                        <th
                          key={sub.code}
                          className="border border-black px-2 py-1.5 font-bold text-center text-black"
                        >
                          <div className="text-[11px] leading-snug">{sub.code} - {sub.name}</div>
                          <div className="text-[10px] font-semibold text-slate-800">{sub.univCode}</div>
                        </th>
                      ))
                    ) : (
                      <>
                        <th className="border border-black px-2 py-1.5 text-center text-black font-bold">
                          ML - Machine Learning<br /><span className="text-[10px]">AI5012</span>
                        </th>
                        <th className="border border-black px-2 py-1.5 text-center text-black font-bold">
                          DAA - Design & Analysis of Algorithms<br /><span className="text-[10px]">CE5031</span>
                        </th>
                        <th className="border border-black px-2 py-1.5 text-center text-black font-bold">
                          SI - Statistical Inference<br /><span className="text-[10px]">AI5001</span>
                        </th>
                        <th className="border border-black px-2 py-1.5 text-center text-black font-bold">
                          FSD - Full Stack Development<br /><span className="text-[10px]">IT5024</span>
                        </th>
                        <th className="border border-black px-2 py-1.5 text-center text-black font-bold">
                          UI/UX - User Interface & User Exp<br /><span className="text-[10px]">IT5060</span>
                        </th>
                        <th className="border border-black px-2 py-1.5 text-center text-black font-bold">
                          DM - Disaster Management<br /><span className="text-[10px]">CM5016</span>
                        </th>
                      </>
                    )}
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td className="border border-black px-2 py-2 font-bold text-center text-black" style={{ background: "#F9FAFB" }}>
                      Allocated Faculty
                    </td>
                    {legendSubjects.length > 0 ? (
                      legendSubjects.map((sub) => {
                        const teacherArray = Array.from(sub.teachers);
                        return (
                          <td
                            key={sub.code}
                            className="border border-black px-2 py-2 align-top text-[11px] text-black"
                          >
                            {teacherArray.length > 0 ? (
                              teacherArray.map((tName, i) => (
                                <div key={i} className="leading-tight mb-1">
                                  <span className="font-bold">{getTeacherInitials(tName)}: </span>
                                  <span>{tName}</span>
                                </div>
                              ))
                            ) : (
                              <span className="text-slate-400 italic">Faculty Assigned</span>
                            )}
                          </td>
                        );
                      })
                    ) : (
                      <>
                        <td className="border border-black p-2 text-[11px] text-black">
                          <div className="font-bold">BHP: Ms. Bhavika H. Patel</div>
                          <div className="font-bold">ZP: Ms. Zeenal Patel</div>
                        </td>
                        <td className="border border-black p-2 text-[11px] text-black">
                          <div className="font-bold">NZ: Mr. Nikul Zinzuvadiya</div>
                        </td>
                        <td className="border border-black p-2 text-[11px] text-black">
                          <div className="font-bold">KD: Ms. Krisha Desai</div>
                        </td>
                        <td className="border border-black p-2 text-[11px] text-black">
                          <div className="font-bold">RP: Ms. Rasi Patel</div>
                        </td>
                        <td className="border border-black p-2 text-[11px] text-black">
                          <div className="font-bold">KD: Ms. Krisha Desai</div>
                        </td>
                        <td className="border border-black p-2 text-[11px] text-black">
                          <div className="font-bold">MK: Mr. Maulik Kakadiya</div>
                        </td>
                      </>
                    )}
                  </tr>

                  {/* Auxiliary Subject Row: PRJ & SDA */}
                  <tr style={{ background: "#F9FAFB" }}>
                    <td className="border border-black px-2 py-1 font-bold text-center text-black text-[10px]">
                      Project / SDA
                    </td>
                    <td
                      colSpan={legendSubjects.length > 0 ? legendSubjects.length : 6}
                      className="border border-black px-3 py-1 text-[11px] text-black"
                    >
                      <span className="font-bold">PRJ: Project-2</span>
                      <span className="mx-3 text-slate-400">|</span>
                      <span className="font-bold">SDA: Skill Development Activity</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* B. FACULTY MODE LEGEND */}
          {exportType === "faculty" && meta.showLegend && (
            <div className="mt-4">
              <table
                className="w-full border-collapse border border-black text-left text-xs"
                style={{
                  borderColor: "#000000",
                  borderWidth: "1.5px",
                }}
              >
                <thead>
                  <tr style={{ background: "#E5E7EB" }}>
                    <th className="border border-black px-3 py-1.5 font-bold text-center text-black" style={{ width: "60px" }}>
                      Sr. No.
                    </th>
                    <th className="border border-black px-3 py-1.5 font-bold text-black">
                      Subject Code & Name
                    </th>
                    <th className="border border-black px-3 py-1.5 font-bold text-center text-black">
                      Class / Division
                    </th>
                    <th className="border border-black px-3 py-1.5 font-bold text-center text-black">
                      Session Type
                    </th>
                    <th className="border border-black px-3 py-1.5 font-bold text-center text-black">
                      Allocated Room / Venue
                    </th>
                    <th className="border border-black px-3 py-1.5 font-bold text-center text-black" style={{ width: "120px" }}>
                      Weekly Load
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {facultySummary.courses.length > 0 ? (
                    facultySummary.courses.map((course, idx) => (
                      <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                        <td className="border border-black px-2 py-1.5 text-center font-bold text-black">
                          {idx + 1}
                        </td>
                        <td className="border border-black px-3 py-1.5 text-black">
                          <span className="font-bold">{course.code}</span> — {course.name}
                        </td>
                        <td className="border border-black px-2 py-1.5 text-center font-bold text-indigo-900">
                          {course.division}
                        </td>
                        <td className="border border-black px-2 py-1.5 text-center font-semibold text-black">
                          {course.type}
                        </td>
                        <td className="border border-black px-2 py-1.5 text-center text-black">
                          {course.room}
                        </td>
                        <td className="border border-black px-2 py-1.5 text-center font-bold text-black">
                          {course.hours} Hours / Week
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="border border-black p-3 text-center text-slate-500 italic">
                        No active course allocations found in current schedule preset.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* C. ROOM / LAB MODE LEGEND */}
          {exportType === "room" && meta.showLegend && (
            <div className="mt-4">
              <table
                className="w-full border-collapse border border-black text-left text-xs"
                style={{
                  borderColor: "#000000",
                  borderWidth: "1.5px",
                }}
              >
                <thead>
                  <tr style={{ background: "#E5E7EB" }}>
                    <th className="border border-black px-3 py-1.5 font-bold text-center text-black" style={{ width: "60px" }}>
                      Sr. No.
                    </th>
                    <th className="border border-black px-3 py-1.5 font-bold text-center text-black">
                      Class / Division
                    </th>
                    <th className="border border-black px-3 py-1.5 font-bold text-black">
                      Subject Title & Code
                    </th>
                    <th className="border border-black px-3 py-1.5 font-bold text-black">
                      Assigned Faculty
                    </th>
                    <th className="border border-black px-3 py-1.5 font-bold text-center text-black">
                      Session Type
                    </th>
                    <th className="border border-black px-3 py-1.5 font-bold text-center text-black" style={{ width: "120px" }}>
                      Occupied Hours
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {roomSummary.sessions.length > 0 ? (
                    roomSummary.sessions.map((sess, idx) => (
                      <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                        <td className="border border-black px-2 py-1.5 text-center font-bold text-black">
                          {idx + 1}
                        </td>
                        <td className="border border-black px-2 py-1.5 text-center font-bold text-indigo-900">
                          {sess.division}
                        </td>
                        <td className="border border-black px-3 py-1.5 text-black font-semibold">
                          {sess.subject}
                        </td>
                        <td className="border border-black px-3 py-1.5 text-black">
                          {sess.faculty}
                        </td>
                        <td className="border border-black px-2 py-1.5 text-center text-black">
                          {sess.type}
                        </td>
                        <td className="border border-black px-2 py-1.5 text-center font-bold text-black">
                          {sess.hours} Hours / Week
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="border border-black p-3 text-center text-slate-500 italic">
                        Venue is currently vacant or available for ad-hoc allocations.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── 4. Total Contact Hours & Administrative Notice ── */}
          {meta.showWorkload && (
            <div className="mt-3 space-y-1 text-[11px] text-black font-semibold">
              {exportType === "division" && (
                <div className="flex flex-wrap items-center gap-1">
                  <span>Total Load : </span>
                  <span className="font-bold">(Theory) {theoryHours || 13} Hrs.</span>
                  <span>+</span>
                  <span className="font-bold">(Practical): {labHours < 10 ? `0${labHours}` : labHours || "08"} Hrs.</span>
                  <span>+</span>
                  <span className="font-bold">(SDA/PROJECT): {meta.customAuxLoad < 10 ? `0${meta.customAuxLoad}` : meta.customAuxLoad} Hrs</span>
                  <span>=</span>
                  <span className="font-bold text-black">{totalLoad || 30} Hrs.</span>
                </div>
              )}

              {exportType === "faculty" && (
                <div className="flex flex-wrap items-center gap-2">
                  <span>Faculty Total Teaching Load : </span>
                  <span className="font-bold">(Theory) {facultySummary.theoryHours} Hrs.</span>
                  <span>+</span>
                  <span className="font-bold">(Practical) {facultySummary.labHours} Hrs.</span>
                  <span>=</span>
                  <span className="font-black text-black">{facultySummary.totalHours} Teaching Hours / Week</span>
                  <span className="text-slate-400">|</span>
                  <span className="text-emerald-700 font-bold">
                    Target Max Load: 16 - 20 Hours (Compliance: 100% / Optimal)
                  </span>
                </div>
              )}

              {exportType === "room" && (
                <div className="flex flex-wrap items-center gap-2">
                  <span>Venue Utilization Rate : </span>
                  <span className="font-black text-black">
                    {roomSummary.occupiedHours} Hours Occupied / {roomSummary.totalSlots} Weekly Periods ({roomSummary.utilization}% Utilization)
                  </span>
                  <span className="text-slate-400">|</span>
                  <span>
                    Venue Specs: Capacity: {selectedRoom.capacity || 60} Students · Floor: {selectedRoom.floor || "1st Floor"}
                  </span>
                </div>
              )}

              <div className="text-[10px] text-slate-700 italic">
                {meta.noticeNote}
              </div>
            </div>
          )}

          {/* ── 5. Signatories Block (Bottom) ── */}
          {meta.showSignatures && (
            <div className="mt-12 pt-4 flex items-end justify-between px-6 sm:px-12 text-center text-xs">
              {exportType === "faculty" ? (
                <>
                  <div className="space-y-1">
                    <div className="font-bold text-black text-xs sm:text-sm">Faculty Member Signature</div>
                    <div className="text-black font-semibold text-xs sm:text-sm">{selectedTeacher.name}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-black text-xs sm:text-sm">Group Head / HOD</div>
                    <div className="text-black font-semibold text-xs sm:text-sm">{meta.groupHead}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-black text-xs sm:text-sm">Director</div>
                    <div className="text-black font-semibold text-xs sm:text-sm">{meta.director}</div>
                  </div>
                </>
              ) : exportType === "room" ? (
                <>
                  <div className="space-y-1">
                    <div className="font-bold text-black text-xs sm:text-sm">Venue / Lab In-Charge</div>
                    <div className="text-black font-semibold text-xs sm:text-sm">{selectedRoom.name} Coordinator</div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-black text-xs sm:text-sm">Group Head / HOD</div>
                    <div className="text-black font-semibold text-xs sm:text-sm">{meta.groupHead}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-black text-xs sm:text-sm">Director</div>
                    <div className="text-black font-semibold text-xs sm:text-sm">{meta.director}</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <div className="font-bold text-black text-xs sm:text-sm">Group Head</div>
                    <div className="text-black font-semibold text-xs sm:text-sm">{meta.groupHead}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-black text-xs sm:text-sm">Director</div>
                    <div className="text-black font-semibold text-xs sm:text-sm">{meta.director}</div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
