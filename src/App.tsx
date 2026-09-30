import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import {
  Layers, LayoutDashboard, ClipboardList, CalendarClock, FolderOpen,
  Users, Plus, Search, X, ChevronDown, ChevronRight, ChevronLeft,
  ChevronUp, Check, CheckCircle, AlertTriangle, AlertCircle, Bell,
  Clock, Calendar, Hash, Download, Upload, Sparkles, Pencil, Trash2,
  Copy, Info, Loader2, Link2, UserCheck, Circle, ArrowLeft,
  List, Columns, Home, MapPin, ExternalLink, FileText, CalendarDays,
  FileClock, MessageSquare, Settings, UserPlus,
} from "lucide-react"

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
type ProjectView = "overview"|"tasks"|"meetings"|"files"|"deliverables"|"team"|"settings"
type TaskStatus = "TODO"|"IN_PROGRESS"|"DONE"
type MemberRole = "LEADER"|"MEMBER"|"OBSERVER"

interface Member { id:string; name:string; role:MemberRole; color:string; email:string; lastActiveAt:string }
interface Requirement { id:string; content:string; required:boolean }
interface FileReview {
  id:string; fileGroupId:string; fileVersion:number
  requestedByMemberId:string; reviewerMemberId:string
  status:"pending"|"approved"|"change_requested"
  comment:string; createdAt:string; reviewedAt:string
}
interface SubmissionRecord {
  id:string; submittedByMemberId:string; submittedAt:string
  fileGroupId:string; fileVersion:number
  submissionPath:string; note:string
}
interface Deliverable {
  id:string; title:string; dueDate:string; ownerMemberId:string
  submissionMethod:string; description:string; requirements:Requirement[]
  status:"PREPARING"|"SUBMITTED"
  reviews:FileReview[]; submissionRecords:SubmissionRecord[]
}
type TaskPriority = "HIGH"|"MEDIUM"|"LOW"|""
interface Task {
  id:string; title:string; status:TaskStatus; assigneeMemberId:string
  assigneeMemberIds:string[]; priority:TaskPriority; description:string
  dueDate:string; completionCriteria:string; deliverableId:string
  requirementId:string; meetingId:string; meetingItemId:string
  updatedAt:string; createdAt:string
}
interface MeetingActionItem { id:string; assigneeMemberId:string; task:string; dueDate:string; taskId:string }
interface Meeting {
  id:string; title:string; date:string; time:string; location:string
  attendeeMemberIds:string[]; checkinCode:string; checkedInMemberIds:string[]
  hasMinutes:boolean; minutesContent:string
  aiSummary:{ keyDecisions:string[]; actionItems:MeetingActionItem[]; nextSteps:string[] }|null
  manualActionItems:MeetingActionItem[]
  createdAt:string
}
interface FileVersion {
  version:number; uploadedByMemberId:string; uploadedAt:string
  size:string; changeNote:string; changeType:"new"|"modified"; fileDataKey?:string
}
interface FileGroup { id:string; name:string; category:string; versions:FileVersion[] }
interface ActivityEntry { id:string; description:string; memberId:string; createdAt:string }

interface Project {
  id:string; name:string; subject:string; semester:string; description:string; deadline:string
  isDemo:boolean; createdAt:string
  members:Member[]; tasks:Task[]; deliverables:Deliverable[]
  meetings:Meeting[]; files:FileGroup[]
  readAlertIds:string[]
  activityLog:ActivityEntry[]
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════
const MY_USER_ID = (() => {
  const k = "blackbox_user_id"
  let s = localStorage.getItem(k)
  if (!s) { s = Math.random().toString(36).slice(2, 10); localStorage.setItem(k, s) }
  return s
})()
const uid = () => Math.random().toString(36).slice(2, 10)
const MEMBER_COLORS = ["#2563eb","#0891b2","#be185d","#059669","#d97706","#7c3aed","#dc2626"]
const STORAGE_KEY = "blackbox_v3_projects"
const FILE_DATA_KEY = "blackbox_v3_file_data"

// ═══════════════════════════════════════════════════════════════
// DEMO DATA
// ═══════════════════════════════════════════════════════════════
function createDemoProject(): Project {
  const m1id = MY_USER_ID, m2id = "demo-m2", m3id = "demo-m3"
  return {
    id:"demo-project", name:"캠퍼스 생활 개선 서비스",
    subject:"소프트웨어공학", semester:"2026-1",
    description:"대학생 캠퍼스 생활 불편 해소를 위한 모바일 서비스 기획 및 초기 프로토타입 개발",
    deadline:"2026-11-29", isDemo:true, createdAt:"2026-09-01T09:00:00",
    readAlertIds:[], activityLog:[],
    members:[
      { id:m1id, name:"이지민", role:"LEADER",  color:"#2563eb", email:"jimin@univ.ac.kr",  lastActiveAt:"2026-09-29T10:00:00" },
      { id:m2id, name:"박서준", role:"MEMBER",  color:"#0891b2", email:"seojun@univ.ac.kr", lastActiveAt:"2026-09-29T09:30:00" },
      { id:m3id, name:"최유나", role:"MEMBER",  color:"#be185d", email:"yuna@univ.ac.kr",   lastActiveAt:"2026-09-14T14:00:00" },
    ],
    deliverables:[
      { id:"d1", title:"중간발표 자료", dueDate:"2026-10-20", ownerMemberId:m1id, submissionMethod:"학교 LMS 과제함",
        description:"사용자 조사 결과와 초기 UI 설계 발표", status:"PREPARING" as const,
        reviews:[], submissionRecords:[],
        requirements:[
          { id:"r1", content:"사용자 인터뷰 3건 이상 포함", required:true },
          { id:"r2", content:"시장 분석 및 경쟁 서비스 비교 포함", required:true },
          { id:"r3", content:"UI 프로토타입 화면 3개 이상", required:false },
        ]},
      { id:"d2", title:"최종 보고서", dueDate:"2026-11-28", ownerMemberId:"", submissionMethod:"",
        description:"서비스 개선 결과물과 사용자 테스트 결과", status:"PREPARING" as const,
        reviews:[], submissionRecords:[],
        requirements:[
          { id:"r4", content:"개선 전후 화면 비교 포함", required:true },
          { id:"r5", content:"사용자 테스트 결과 (5명 이상)", required:true },
        ]},
    ],
    tasks:[
      { id:"t1", title:"사용자 인터뷰 정리", status:"DONE" as TaskStatus,        assigneeMemberId:m2id, assigneeMemberIds:[m2id], priority:"" as TaskPriority, description:"", dueDate:"2026-10-05", completionCriteria:"인터뷰 3건 공통 문제 표로 정리, 출처 첨부",   deliverableId:"d1", requirementId:"r1", meetingId:"mt1", meetingItemId:"ai1", updatedAt:"2026-09-28T15:00:00", createdAt:"2026-09-10T10:00:00" },
      { id:"t2", title:"UI 개선안 작성",     status:"IN_PROGRESS" as TaskStatus, assigneeMemberId:m3id, assigneeMemberIds:[m3id], priority:"HIGH" as TaskPriority, description:"", dueDate:"2026-10-12", completionCriteria:"개선 전후 화면 3개 이상 Figma로 작성",        deliverableId:"d1", requirementId:"r3", meetingId:"mt1", meetingItemId:"ai2", updatedAt:"2026-09-27T11:00:00", createdAt:"2026-09-10T10:00:00" },
      { id:"t3", title:"발표자료 통합",      status:"TODO" as TaskStatus,        assigneeMemberId:m1id, assigneeMemberIds:[m1id], priority:"MEDIUM" as TaskPriority, description:"", dueDate:"2026-10-17", completionCriteria:"파트별 자료 합쳐 흐름 확인, 발표 연습 1회",   deliverableId:"d1", requirementId:"",  meetingId:"",    meetingItemId:"",    updatedAt:"2026-09-20T10:00:00", createdAt:"2026-09-15T09:00:00" },
      { id:"t4", title:"사용자 테스트 진행", status:"TODO" as TaskStatus,        assigneeMemberId:"",   assigneeMemberIds:[], priority:"" as TaskPriority, description:"", dueDate:"2026-11-10", completionCriteria:"참여자 5명 이상, 결과 스프레드시트 정리",       deliverableId:"d2", requirementId:"r5", meetingId:"",    meetingItemId:"",    updatedAt:"2026-09-25T10:00:00", createdAt:"2026-09-15T09:00:00" },
      { id:"t5", title:"경쟁 서비스 조사",   status:"TODO" as TaskStatus,        assigneeMemberId:m2id, assigneeMemberIds:[m2id], priority:"LOW" as TaskPriority, description:"", dueDate:"",           completionCriteria:"경쟁 사례 3개 출처와 비교표로 정리",            deliverableId:"",   requirementId:"",  meetingId:"",    meetingItemId:"",    updatedAt:"2026-09-22T10:00:00", createdAt:"2026-09-15T09:00:00" },
    ],
    meetings:[
      { id:"mt1", title:"중간 점검 회의", date:"2026-09-15", time:"14:00", location:"도서관 스터디룸 3",
        attendeeMemberIds:[m1id,m2id,m3id], checkinCode:"MT2600", checkedInMemberIds:[m1id,m2id,m3id],
        hasMinutes:true,
        minutesContent:"## 안건 1: 인터뷰 진행 현황\n\n박서준: 현재 2건 완료. 나머지 1건은 이번 주 진행 예정.\n\n## 안건 2: UI 방향성 논의\n\n최유나가 초기 와이어프레임 3개 제시. 팀원 피드백 반영하여 수정 예정.\n\n## 결정 사항\n\n- 인터뷰 3건을 9월 19일까지 완료\n- 최유나 UI 프로토타입 9월 28일 전 1차 완성",
        manualActionItems:[],
        aiSummary:{
          keyDecisions:["인터뷰 3건 9월 19일까지 완료","UI 프로토타입 1차 완성: 9월 28일","다음 회의: 9월 28일 15:00"],
          actionItems:[
            {id:"ai1",assigneeMemberId:m2id,task:"사용자 인터뷰 3번째 건 진행 및 정리",dueDate:"2026-09-19",taskId:"t1"},
            {id:"ai2",assigneeMemberId:m3id,task:"UI 프로토타입 1차 완성 (Figma)",dueDate:"2026-09-27",taskId:"t2"},
            {id:"ai3",assigneeMemberId:m1id,task:"발표자료 구조 초안 작성",dueDate:"2026-09-25",taskId:""},
          ],
          nextSteps:["인터뷰 결과를 공유 드라이브에 업로드","피그마 링크를 단톡에 공유"],
        },
        createdAt:"2026-09-10T09:00:00" },
      { id:"mt2", title:"UI 리뷰 회의", date:"2026-09-28", time:"15:00", location:"도서관 스터디룸 3",
        attendeeMemberIds:[m1id,m2id,m3id], checkinCode:"MT2601", checkedInMemberIds:[m1id,m2id],
        hasMinutes:false, minutesContent:"", aiSummary:null, manualActionItems:[],
        createdAt:"2026-09-15T09:00:00" },
    ],
    files:[
      { id:"f1", name:"발표자료_중간.pptx", category:"발표자료", versions:[
        { version:2, uploadedByMemberId:m1id, uploadedAt:"2026-09-27T16:30:00", size:"4.2 MB", changeNote:"디자인 템플릿 변경, 인터뷰 결과 슬라이드 추가", changeType:"modified" },
        { version:1, uploadedByMemberId:m1id, uploadedAt:"2026-09-22T11:00:00", size:"3.8 MB", changeNote:"초안 업로드", changeType:"new" },
      ]},
      { id:"f2", name:"사용자인터뷰_결과.xlsx", category:"조사자료", versions:[
        { version:1, uploadedByMemberId:m2id, uploadedAt:"2026-09-26T14:00:00", size:"0.8 MB", changeNote:"인터뷰 3건 정리 완료", changeType:"new" },
      ]},
    ],
  }
}

// ═══════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════
function migrateProject(raw: any): Project {
  return {
    id: raw.id ?? uid(),
    name: raw.name ?? "프로젝트",
    subject: raw.subject ?? "",
    semester: raw.semester ?? "",
    description: raw.description ?? "",
    deadline: raw.deadline ?? "",
    isDemo: raw.isDemo ?? false,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    members: (raw.members ?? []).map((m: any) => ({
      email: "", lastActiveAt: new Date().toISOString(), ...m,
    })),
    tasks: (raw.tasks ?? []).map((t: any) => ({
      meetingItemId: "", description: "", priority: "" as TaskPriority,
      assigneeMemberIds: t.assigneeMemberIds ?? (t.assigneeMemberId ? [t.assigneeMemberId] : []),
      ...t,
    })),
    deliverables: (raw.deliverables ?? []).map((d: any) => ({
      submissionMethod: "", description: "", status: "PREPARING" as const,
      requirements: [], reviews: [], submissionRecords: [], ...d,
    })),
    meetings: (raw.meetings ?? []).map((m: any) => ({
      ...m,
      manualActionItems: m.manualActionItems ?? [],
      aiSummary: m.aiSummary ? {
        ...m.aiSummary,
        actionItems: (m.aiSummary.actionItems ?? []).map((a: any) => ({
          id: a.id ?? uid(), taskId: a.taskId ?? "", ...a,
        })),
      } : null,
    })),
    files: raw.files ?? [],
    readAlertIds: raw.readAlertIds ?? [],
    activityLog: raw.activityLog ?? [],
  }
}

function loadProjects(): Project[] {
  try {
    // Try v3 first
    const raw3 = localStorage.getItem(STORAGE_KEY)
    if (raw3) {
      const parsed = JSON.parse(raw3) as any[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        const migrated = parsed.map(migrateProject)
        if (!migrated.some(p => p.id === "demo-project")) {
          return [createDemoProject(), ...migrated]
        }
        return migrated
      }
    }
    // Try v2 migration
    const raw2 = localStorage.getItem("blackbox_v2_projects")
    if (raw2) {
      const parsed = JSON.parse(raw2) as any[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        const migrated = parsed.map(migrateProject)
        if (!migrated.some(p => p.id === "demo-project")) {
          return [createDemoProject(), ...migrated]
        }
        return migrated
      }
    }
    return [createDemoProject()]
  } catch { return [createDemoProject()] }
}

function saveProjects(projects: Project[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
    return true
  } catch { return false }
}

function storeFileData(key: string, dataUrl: string): boolean {
  try {
    const stored = JSON.parse(localStorage.getItem(FILE_DATA_KEY) ?? "{}")
    stored[key] = dataUrl
    localStorage.setItem(FILE_DATA_KEY, JSON.stringify(stored))
    return true
  } catch { return false }
}
function getFileData(key: string): string | null {
  try {
    const s = localStorage.getItem(FILE_DATA_KEY)
    if (!s) return null
    return JSON.parse(s)[key] ?? null
  } catch { return null }
}

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════
function getMyMember(project: Project): Member | undefined {
  return project.members.find(m => m.id === MY_USER_ID)
}
function getMember(project: Project, id: string): Member | undefined {
  return project.members.find(m => m.id === id)
}
function getMemberName(project: Project, id: string): string {
  return getMember(project, id)?.name ?? "알 수 없음"
}
function fmtDate(iso: string) {
  if (!iso) return "미설정"
  try { return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }) } catch { return iso }
}
function fmtDateTime(iso: string) {
  if (!iso) return ""
  try { return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) } catch { return iso }
}
function daysUntil(d: string): number | null {
  if (!d) return null
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}
function dueBadge(dateStr: string) {
  const d = daysUntil(dateStr)
  if (d === null) return null
  if (d < 0)  return { label:`마감 ${Math.abs(d)}일 초과`, cls:"bg-red-50 text-red-700 border border-red-200" }
  if (d === 0) return { label:"오늘 마감", cls:"bg-red-50 text-red-700 border border-red-200" }
  if (d <= 3) return { label:`D-${d}`, cls:"bg-orange-50 text-orange-700 border border-orange-200" }
  if (d <= 7) return { label:`D-${d}`, cls:"bg-amber-50 text-amber-700 border border-amber-200" }
  return { label:`D-${d}`, cls:"bg-slate-100 text-slate-600 border border-slate-200" }
}
function statusCfg(s: TaskStatus) {
  if (s === "TODO")        return { label:"할 일",    dot:"bg-slate-400",   text:"text-slate-600",   bg:"bg-slate-50",   border:"border-slate-200" }
  if (s === "IN_PROGRESS") return { label:"진행 중",  dot:"bg-blue-500",    text:"text-blue-700",    bg:"bg-blue-50",    border:"border-blue-200" }
  return                          { label:"업무 완료", dot:"bg-emerald-500", text:"text-emerald-700", bg:"bg-emerald-50", border:"border-emerald-200" }
}
function renderMarkdown(text: string): React.ReactNode[] {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("## ")) return <h3 key={i} className="font-semibold text-slate-900 text-sm mt-4 mb-1 first:mt-0">{line.slice(3)}</h3>
    if (line.startsWith("# "))  return <h2 key={i} className="font-bold text-slate-900 text-base mt-4 mb-2 first:mt-0">{line.slice(2)}</h2>
    if (line.startsWith("- "))  return <li key={i} className="text-sm text-slate-700 ml-4 list-disc leading-relaxed">{line.slice(2)}</li>
    if (!line.trim())           return <br key={i} />
    return <p key={i} className="text-sm text-slate-700 leading-relaxed">{line}</p>
  })
}
function addActivity(project: Project, description: string): Project {
  const entry: ActivityEntry = { id: uid(), description, memberId: MY_USER_ID, createdAt: new Date().toISOString() }
  return { ...project, activityLog: [entry, ...project.activityLog].slice(0, 100) }
}

// ═══════════════════════════════════════════════════════════════
// DYNAMIC ALERTS
// ═══════════════════════════════════════════════════════════════
type AlertType = "inactive"|"unassigned"|"unlinked"|"overdue"
interface ComputedAlert {
  id:string; type:AlertType; severity:"warning"|"info"
  title:string; detail:string; relatedTaskId:string; relatedMemberId:string; isRead:boolean
}

function computeAlerts(project: Project): ComputedAlert[] {
  const alerts: ComputedAlert[] = []
  project.tasks.filter(t => t.status !== "DONE" && t.dueDate && (daysUntil(t.dueDate) ?? 0) < 0).forEach(t => {
    const id = `overdue-${t.id}`
    alerts.push({ id, type:"overdue", severity:"warning", title:"마감 초과 업무",
      detail:`"${t.title}" 업무가 ${Math.abs(daysUntil(t.dueDate)!)}일 초과됐습니다.`,
      relatedTaskId:t.id, relatedMemberId:"", isRead:project.readAlertIds.includes(id) })
  })
  project.tasks.filter(t => !t.assigneeMemberId && t.status !== "DONE").forEach(t => {
    const id = `unassigned-${t.id}`
    alerts.push({ id, type:"unassigned", severity:"warning", title:"담당자 미지정 업무",
      detail:`"${t.title}" 업무에 담당자가 없습니다.`,
      relatedTaskId:t.id, relatedMemberId:"", isRead:project.readAlertIds.includes(id) })
  })
  project.tasks.filter(t => !t.deliverableId && t.status !== "DONE").forEach(t => {
    const id = `unlinked-${t.id}`
    alerts.push({ id, type:"unlinked", severity:"info", title:"제출물 미연결 업무",
      detail:`"${t.title}" 업무가 제출물에 연결되지 않았습니다.`,
      relatedTaskId:t.id, relatedMemberId:"", isRead:project.readAlertIds.includes(id) })
  })
  project.members.forEach(m => {
    const daysSince = Math.floor((Date.now() - new Date(m.lastActiveAt).getTime()) / 86400000)
    if (daysSince >= 14) {
      const id = `inactive-${m.id}`
      alerts.push({ id, type:"inactive", severity:"warning", title:"최근 2주 활동 없음",
        detail:`${m.name}님의 마지막 활동이 ${daysSince}일 전입니다.`,
        relatedTaskId:"", relatedMemberId:m.id, isRead:project.readAlertIds.includes(id) })
    }
  })
  return alerts
}

// ═══════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════
function Btn({ children, onClick, variant = "primary", size = "md", disabled, type = "button", className = "" }: {
  children: React.ReactNode; onClick?: () => void
  variant?: "primary"|"secondary"|"ghost"|"danger"; size?: "sm"|"md"
  disabled?: boolean; type?: "button"|"submit"; className?: string
}) {
  const base = "inline-flex items-center gap-1.5 font-medium rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
  const sz = size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm"
  const v = {
    primary:   "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
    secondary: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:bg-slate-100",
    ghost:     "text-slate-600 hover:bg-slate-100 active:bg-slate-200",
    danger:    "bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 active:bg-red-200",
  }[variant]
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sz} ${v} ${className}`}>
      {children}
    </button>
  )
}

function Avatar({ member, size = 7 }: { member?: Member; size?: number }) {
  const sz = `w-${size} h-${size}`
  const bg = member?.color ?? "#64748b"
  return (
    <div className={`${sz} rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0`}
      style={{ background: bg }}>
      {(member?.name ?? "?").slice(0, 1)}
    </div>
  )
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const c = statusCfg(status)
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />{c.label}
    </span>
  )
}

function EmptyState({ icon: Icon, title, desc, action }: {
  icon: any; title: string; desc: string; action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
        <Icon size={22} className="text-blue-400" />
      </div>
      <p className="text-sm font-semibold text-slate-800 mb-1">{title}</p>
      <p className="text-sm text-slate-500 mb-4 max-w-xs leading-relaxed">{desc}</p>
      {action}
    </div>
  )
}

function Toast({ message, type = "success", onDismiss }: {
  message: string; type?: "success"|"error"; onDismiss: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, type === "error" ? 7000 : 3000)
    return () => clearTimeout(t)
  }, [onDismiss, type])
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] text-white text-sm px-5 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-fade-in max-w-sm text-center ${type === "error" ? "bg-red-700" : "bg-slate-900"}`}>
      {type === "error"
        ? <AlertCircle size={14} className="text-red-300 shrink-0" />
        : <CheckCircle size={14} className="text-emerald-400 shrink-0" />}
      <span>{message}</span>
    </div>
  )
}

function UnsavedChangesDialog({ onSave, onDiscard, onCancel, saving }: {
  onSave: () => void; onDiscard: () => void; onCancel: () => void; saving?: boolean
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-fade-in">
        <h3 className="text-base font-bold text-slate-900 font-display mb-1">저장하지 않은 변경이 있습니다</h3>
        <p className="text-sm text-slate-500 mb-5 leading-relaxed">이동하면 작성 중인 내용이 사라집니다.</p>
        <div className="flex gap-2 justify-end flex-wrap">
          <Btn variant="ghost" onClick={onCancel}>계속 작성</Btn>
          <Btn variant="secondary" onClick={onDiscard}>변경 버리기</Btn>
          <Btn onClick={onSave} disabled={saving}>
            {saving ? <><Loader2 size={12} className="animate-spin" />저장 중…</> : "저장하고 이동"}
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// PROJECT LIST
// ═══════════════════════════════════════════════════════════════
function ProjectList({ projects, onOpen, onCreateClick }: {
  projects: Project[]; onOpen: (id: string) => void; onCreateClick: () => void
}) {
  const myMemberName = (() => {
    const p = projects.find(p => getMyMember(p))
    return p ? (getMyMember(p)?.name ?? "나") : "나"
  })()
  const [tab, setTab] = useState<"projects"|"mytasks">("projects")

  // Cross-project my tasks
  const myAllTasks = useMemo(() => {
    const result: { task: Task; project: Project }[] = []
    projects.filter(p => !p.isDemo).forEach(p => {
      p.tasks.filter(t => t.assigneeMemberId === MY_USER_ID && t.status !== "DONE").forEach(t => {
        result.push({ task: t, project: p })
      })
    })
    return result.sort((a, b) => {
      const da = daysUntil(a.task.dueDate) ?? 999
      const db = daysUntil(b.task.dueDate) ?? 999
      return da - db
    })
  }, [projects])

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <Layers size={15} className="text-white" />
        </div>
        <span className="text-sm font-bold text-slate-900 font-display">Team Blackbox</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-slate-500">{myMemberName}</span>
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
            {myMemberName.slice(0, 1)}
          </div>
        </div>
      </header>
      <main className="flex-1 px-6 py-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-5">
          <div className="flex gap-0 border-b border-slate-200">
            {[["projects","내 프로젝트"],["mytasks","내 업무"]] .map(([key, label]) => (
              <button key={key} onClick={() => setTab(key as any)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === key ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
                {label}
                {key === "mytasks" && myAllTasks.length > 0 && (
                  <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{myAllTasks.length}</span>
                )}
              </button>
            ))}
          </div>
          {tab === "projects" && <Btn onClick={onCreateClick}><Plus size={15} />새 프로젝트</Btn>}
        </div>

        {tab === "projects" && (
          projects.length === 0 ? (
            <EmptyState icon={FolderOpen} title="아직 참여한 프로젝트가 없습니다"
              desc="새 프로젝트를 만들고 팀원을 초대하세요."
              action={<Btn onClick={onCreateClick}><Plus size={14} />첫 프로젝트 만들기</Btn>} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {projects.map(p => {
                const me = getMyMember(p)
                const openTasks = p.tasks.filter(t => t.status !== "DONE").length
                const upcomingDels = [...p.deliverables]
                  .filter(d => d.dueDate && d.status !== "SUBMITTED")
                  .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                const nextDel = upcomingDels[0]
                const due = nextDel ? dueBadge(nextDel.dueDate) : null
                const unreadAlerts = p.isDemo ? 0 : computeAlerts(p).filter(a => !a.isRead).length
                return (
                  <button key={p.id} onClick={() => onOpen(p.id)}
                    className="text-left bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all focus-visible:outline-2 focus-visible:outline-blue-500 group">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <p className="text-base font-bold text-slate-900 font-display truncate">{p.name}</p>
                          {p.isDemo && (
                            <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-medium shrink-0">예시</span>
                          )}
                        </div>
                        {(p.subject || p.semester) && (
                          <p className="text-xs text-slate-500">{p.subject}{p.semester ? ` · ${p.semester}` : ""}</p>
                        )}
                      </div>
                      <FolderOpen size={16} className="shrink-0 mt-0.5 text-slate-300 group-hover:text-blue-400 transition-colors" />
                    </div>
                    {p.description && (
                      <p className="text-sm text-slate-500 mb-3 line-clamp-2 leading-relaxed">{p.description}</p>
                    )}
                    <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Users size={11} />{p.members.length}명</span>
                      <span className="flex items-center gap-1"><ClipboardList size={11} />진행 중 {openTasks}개</span>
                      {p.deadline && (
                        <span className="flex items-center gap-1"><Calendar size={11} />{p.deadline.slice(0, 7)}</span>
                      )}
                      {me && (
                        <span className="ml-auto font-medium text-blue-600">
                          {me.role === "LEADER" ? "팀장" : me.role === "OBSERVER" ? "열람" : "팀원"}
                        </span>
                      )}
                    </div>
                    {(due || unreadAlerts > 0) && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                        {due && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${due.cls}`}>
                            {nextDel?.title} {due.label}
                          </span>
                        )}
                        {unreadAlerts > 0 && (
                          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle size={10} />확인 필요 {unreadAlerts}건
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )
        )}

        {tab === "mytasks" && (
          <div>
            {myAllTasks.length === 0 ? (
              <EmptyState icon={ClipboardList} title="담당 업무가 없습니다"
                desc="참여 중인 프로젝트에서 업무를 생성하거나 담당자를 지정받으면 여기에 표시됩니다." />
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                {myAllTasks.map(({ task: t, project: p }) => {
                  const due = dueBadge(t.dueDate)
                  const del = p.deliverables.find(d => d.id === t.deliverableId)
                  return (
                    <button key={`${p.id}-${t.id}`} onClick={() => onOpen(p.id)}
                      className="w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                      <StatusBadge status={t.status} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{t.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-xs text-blue-600 font-medium">{p.name}</span>
                          {del && <><span className="text-xs text-slate-300">·</span><span className="text-xs text-slate-500 truncate">{del.title}</span></>}
                        </div>
                      </div>
                      {due && <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${due.cls}`}>{due.label}</span>}
                      <ChevronRight size={13} className="text-slate-300 shrink-0" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// CREATE PROJECT MODAL
// ═══════════════════════════════════════════════════════════════
function CreateProjectModal({ onClose, onCreate }: {
  onClose: () => void; onCreate: (p: Project) => void
}) {
  const [form, setForm] = useState({ name:"", subject:"", semester:"", description:"", deadline:"" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const nameRef = useRef<HTMLInputElement>(null)
  useEffect(() => { nameRef.current?.focus() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError("프로젝트 이름을 입력해 주세요."); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 300))
    const project: Project = {
      id: uid(), name: form.name.trim(), subject: form.subject,
      semester: form.semester, description: form.description, deadline: form.deadline,
      isDemo: false, createdAt: new Date().toISOString(),
      members: [{ id: MY_USER_ID, name: "나", role: "LEADER", color: "#2563eb", email: "", lastActiveAt: new Date().toISOString() }],
      tasks: [], deliverables: [], meetings: [], files: [], readAlertIds: [], activityLog: [],
    }
    onCreate(project)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative w-full max-w-md bg-white rounded-xl shadow-xl p-6 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 font-display">새 프로젝트 만들기</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="닫기">
            <X size={16} className="text-slate-500" />
          </button>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg flex items-center gap-2">
            <AlertCircle size={13} className="shrink-0" />{error}
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">프로젝트 이름 *</label>
          <input ref={nameRef} value={form.name}
            onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setError("") }}
            placeholder="예: 캡스톤 디자인, 졸업 프로젝트"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">과목명</label>
            <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              placeholder="예: 소프트웨어공학"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">학기</label>
            <input value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}
              placeholder="예: 2026-1"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">설명 <span className="text-slate-400 font-normal">(선택)</span></label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
            placeholder="어떤 결과물을 만드는 프로젝트인지 적어 주세요."
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">프로젝트 기한 <span className="text-slate-400 font-normal">(선택)</span></label>
          <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <p className="text-xs text-slate-400">팀원 초대와 제출물 등록은 프로젝트 생성 후 할 수 있습니다.</p>
        <div className="flex justify-end gap-2">
          <Btn variant="secondary" type="button" onClick={onClose}>취소</Btn>
          <Btn type="submit" disabled={saving}>
            {saving ? <><Loader2 size={13} className="animate-spin" />만드는 중…</> : "프로젝트 만들기"}
          </Btn>
        </div>
      </form>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════
const NAV: { view: ProjectView; icon: any; label: string }[] = [
  { view:"overview",     icon:LayoutDashboard, label:"프로젝트 홈" },
  { view:"deliverables", icon:FileText,        label:"제출물" },
  { view:"tasks",        icon:ClipboardList,   label:"업무" },
  { view:"meetings",     icon:CalendarClock,   label:"일정·회의" },
  { view:"files",        icon:FolderOpen,      label:"자료" },
  { view:"team",         icon:Users,           label:"팀원" },
]

function ProjectSidebar({ project, view, setView, alertCount, onBack, onSwitch, projects }: {
  project: Project; view: ProjectView; setView: (v: ProjectView) => void
  alertCount: number; onBack: () => void; onSwitch: (id: string) => void; projects: Project[]
}) {
  const [showSwitch, setShowSwitch] = useState(false)
  return (
    <aside className="w-56 bg-white border-r border-slate-200 h-screen fixed left-0 top-0 flex flex-col z-30">
      <div className="px-3 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <Layers size={13} className="text-white" />
          </div>
          <span className="text-xs font-bold text-slate-900 font-display">Team Blackbox</span>
        </div>
        <button onClick={() => setShowSwitch(v => !v)}
          className="w-full flex items-center gap-2 bg-blue-50 hover:bg-blue-100 rounded-lg px-2.5 py-2 transition-colors text-left">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-blue-500 font-semibold uppercase tracking-wide">현재 프로젝트</p>
            <p className="text-xs font-bold text-blue-900 truncate leading-tight mt-0.5">{project.name}</p>
          </div>
          <ChevronDown size={12} className={`text-blue-400 transition-transform shrink-0 ${showSwitch ? "rotate-180" : ""}`} />
        </button>
        {showSwitch && (
          <div className="mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden animate-fade-in">
            {projects.filter(p => p.id !== project.id).map(p => (
              <button key={p.id} onClick={() => { onSwitch(p.id); setShowSwitch(false) }}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 flex items-center gap-2">
                <FolderOpen size={11} className="text-blue-400 shrink-0" />
                <span className="truncate">{p.name}</span>
              </button>
            ))}
            <button onClick={() => { onBack(); setShowSwitch(false) }}
              className="w-full text-left px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 border-t border-slate-100 flex items-center gap-2">
              <Home size={11} /><span>내 프로젝트 목록</span>
            </button>
          </div>
        )}
      </div>
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ view: v, icon: Icon, label }) => {
          const active = view === v
          return (
            <button key={v} onClick={() => setView(v)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 ${active ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-600 hover:bg-slate-50"}`}>
              <Icon size={15} className={active ? "text-blue-600" : "text-slate-400"} />
              {label}
              {v === "team" && alertCount > 0 && (
                <span className="ml-auto min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {alertCount > 9 ? "9+" : alertCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>
      <div className="px-2 py-2 border-t border-slate-100 space-y-0.5">
        <button onClick={() => setView("settings")}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${view === "settings" ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-500 hover:bg-slate-50"}`}>
          <Settings size={14} className={view === "settings" ? "text-blue-600" : "text-slate-400"} />설정
        </button>
        <button onClick={onBack}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-500 hover:bg-slate-50 transition-colors">
          <Home size={13} />내 프로젝트로
        </button>
      </div>
    </aside>
  )
}

// ═══════════════════════════════════════════════════════════════
// TOP BAR
// ═══════════════════════════════════════════════════════════════
function TopBar({ title, alertCount, onBell, myName }: {
  title: string; alertCount: number; onBell: () => void; myName: string
}) {
  return (
    <header className="h-12 bg-white border-b border-slate-200 flex items-center px-5 gap-3 sticky top-0 z-20">
      <h1 className="text-sm font-semibold text-slate-700 flex-1 truncate">{title}</h1>
      <button onClick={onBell}
        className="relative p-2 rounded-lg hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-500"
        aria-label={`알림${alertCount > 0 ? ` (${alertCount}개 읽지 않음)` : ""}`}>
        <Bell size={16} className="text-slate-500" />
        {alertCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
        )}
      </button>
      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white" title={myName}>
        {myName.slice(0, 1)}
      </div>
    </header>
  )
}

// ═══════════════════════════════════════════════════════════════
// NOTIFICATION PANEL
// ═══════════════════════════════════════════════════════════════
function NotificationPanel({ project, onClose, onMarkRead, onNavigate }: {
  project: Project; onClose: () => void
  onMarkRead: (id: string) => void; onNavigate: (taskId: string) => void
}) {
  const alerts = computeAlerts(project)
  const unread = alerts.filter(a => !a.isRead).length
  const meta: Record<string, { icon: any; cls: string }> = {
    inactive:   { icon: Clock,         cls: "text-orange-600 bg-orange-50 border-orange-200" },
    unassigned: { icon: UserCheck,     cls: "text-amber-600 bg-amber-50 border-amber-200" },
    unlinked:   { icon: Link2,         cls: "text-blue-600 bg-blue-50 border-blue-200" },
    overdue:    { icon: AlertTriangle, cls: "text-red-600 bg-red-50 border-red-200" },
  }
  const actionLabel: Record<string, string> = {
    inactive:"확인하기", unassigned:"담당자 지정", unlinked:"업무 연결", overdue:"업무 보기",
  }
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-96 bg-white shadow-xl h-full flex flex-col animate-slide-in-right">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 font-display">알림</h2>
            {unread > 0
              ? <p className="text-xs text-slate-500">{unread}개 읽지 않음</p>
              : <p className="text-xs text-slate-400">모두 읽었습니다</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="닫기">
            <X size={16} className="text-slate-500" />
          </button>
        </div>
        <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-500">알림은 현재 프로젝트 상태에서 자동으로 계산됩니다. 문제를 해결하면 사라집니다.</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">확인이 필요한 알림이 없습니다</div>
          ) : alerts.map(a => {
            const m = meta[a.type]
            const Icon = m.icon
            const [bgCls, textCls, borderCls] = m.cls.split(" ")
            return (
              <div key={a.id} className={`px-5 py-4 border-b border-slate-100 ${!a.isRead ? "bg-blue-50/30" : ""}`}>
                <div className="flex gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${bgCls} ${borderCls}`}>
                    <Icon size={14} className={textCls} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                      {!a.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-2">{a.detail}</p>
                    <div className="flex items-center gap-3">
                      {a.relatedTaskId && (
                        <button onClick={() => { onMarkRead(a.id); onNavigate(a.relatedTaskId); onClose() }}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800">
                          {actionLabel[a.type]} →
                        </button>
                      )}
                      {!a.isRead && (
                        <button onClick={() => onMarkRead(a.id)} className="text-xs text-slate-400 hover:text-slate-600">
                          읽음
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// OVERVIEW
// ═══════════════════════════════════════════════════════════════
function OverviewView({ project, setView, openTask, openDeliverable, openMeeting, openAlerts }: {
  project: Project; setView: (v: ProjectView) => void
  openTask: (id: string) => void; openDeliverable: (id: string) => void; openMeeting: (id: string) => void
  openAlerts: () => void
}) {
  const me = getMyMember(project)
  const today = new Date().toISOString().slice(0, 10)
  const weekLater = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  const myTasks = project.tasks.filter(t => t.assigneeMemberId === me?.id && t.status !== "DONE")
  const myTasksSorted = [...myTasks].sort((a, b) => {
    const da = daysUntil(a.dueDate) ?? 999
    const db = daysUntil(b.dueDate) ?? 999
    return da - db
  })

  const nextDels = [...project.deliverables]
    .filter(d => d.dueDate && d.status !== "SUBMITTED")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const nextDel = nextDels[0]

  const upcomingMeetings = [...project.meetings]
    .filter(m => m.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)
  const needsMinutes = project.meetings
    .filter(m => m.date < today && !m.hasMinutes)
  const recentFiles = [...project.files]
    .sort((a, b) => b.versions[0].uploadedAt.localeCompare(a.versions[0].uploadedAt))
    .slice(0, 3)
  const alerts = computeAlerts(project).filter(a => !a.isRead)

  // Onboarding for empty projects
  const hasDeliverables = project.deliverables.length > 0
  const hasTasks = project.tasks.length > 0
  const isNewProject = !hasDeliverables && !hasTasks
  const d = project.deadline ? daysUntil(project.deadline) : null
  const totalTasks = project.tasks.length
  const doneTasks = project.tasks.filter(t => t.status === "DONE").length
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  return (
    <div className="p-5 space-y-4 max-w-4xl">
      {/* Project header strip */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {(project.subject || project.semester) && (
              <p className="text-xs text-slate-400 mb-1 font-medium">{project.subject}{project.semester ? ` · ${project.semester}` : ""}</p>
            )}
            <h2 className="text-xl font-bold text-slate-900 font-display leading-tight">{project.name}</h2>
            {project.description && (
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{project.description}</p>
            )}
          </div>
          <div className="shrink-0 text-right">
            {project.deadline && (
              <>
                <p className="text-xs text-slate-400 mb-0.5">최종 기한</p>
                <p className="text-sm font-bold text-slate-900">{project.deadline}</p>
                {d !== null && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${d < 0 ? "bg-red-50 text-red-700 border border-red-200" : d <= 7 ? "bg-orange-50 text-orange-700 border border-orange-200" : "bg-slate-100 text-slate-600"}`}>
                    {d < 0 ? `${Math.abs(d)}일 초과` : d === 0 ? "오늘" : `D-${d}`}
                  </span>
                )}
              </>
            )}
            {totalTasks > 0 && (
              <p className="text-xs text-slate-400 mt-2">업무 {doneTasks}/{totalTasks}완료 ({pct}%)</p>
            )}
          </div>
        </div>
      </div>

      {/* New project onboarding */}
      {isNewProject && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <p className="text-sm font-bold text-blue-900 font-display mb-1">팀플을 시작해 보세요</p>
          <p className="text-sm text-blue-700 mb-4 leading-relaxed">제출물을 등록하고 요구사항을 정리한 다음 업무를 나눠 보세요.</p>
          <div className="flex gap-2 flex-wrap">
            <Btn onClick={() => setView("deliverables")}><FileText size={14} />제출물 등록</Btn>
            <Btn variant="secondary" onClick={() => setView("team")}><Users size={14} />팀원 추가</Btn>
          </div>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" />확인 필요 <span className="text-amber-700 bg-amber-100 text-xs px-1.5 py-0.5 rounded-full">{alerts.length}</span>
            </h3>
            <button onClick={openAlerts} className="text-xs text-blue-600 hover:underline font-medium">전체 보기 →</button>
          </div>
          {alerts.slice(0, 3).map(a => (
            <div key={a.id} className="flex items-start gap-2.5 py-2.5 border-b border-slate-100 last:border-0">
              <AlertTriangle size={13} className="text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{a.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{a.detail}</p>
              </div>
              {a.relatedTaskId && (
                <button onClick={() => openTask(a.relatedTaskId)}
                  className="text-xs text-blue-600 hover:underline shrink-0 font-medium">업무 보기</button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* My tasks */}
        {me && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
                <ClipboardList size={15} className="text-blue-500" />내 업무
              </h3>
              <button onClick={() => setView("tasks")} className="text-xs text-blue-600 hover:underline">전체 →</button>
            </div>
            {myTasksSorted.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">진행 중인 업무가 없습니다</p>
            ) : myTasksSorted.slice(0, 5).map(t => {
              const due = dueBadge(t.dueDate)
              const isOverdue = t.dueDate && (daysUntil(t.dueDate) ?? 0) < 0
              const isToday = t.dueDate === today
              return (
                <button key={t.id} onClick={() => openTask(t.id)}
                  className="w-full flex items-center gap-2.5 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-1 px-1 rounded text-left">
                  <StatusBadge status={t.status} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isOverdue ? "text-red-700" : "text-slate-800"}`}>{t.title}</p>
                    {t.dueDate && <p className={`text-xs mt-0.5 ${isOverdue ? "text-red-500" : isToday ? "text-orange-500" : "text-slate-400"}`}>{t.dueDate}</p>}
                  </div>
                  {due && <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${due.cls}`}>{due.label}</span>}
                </button>
              )
            })}
          </div>
        )}

        {/* Next deliverable */}
        {nextDel ? (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
                <FileText size={15} className="text-blue-500" />가장 가까운 제출물
              </h3>
              <button onClick={() => setView("deliverables")} className="text-xs text-blue-600 hover:underline">전체 →</button>
            </div>
            <button onClick={() => openDeliverable(nextDel.id)} className="w-full text-left hover:bg-slate-50 rounded-lg -mx-1 px-1 py-1 transition-colors">
              <p className="text-sm font-semibold text-slate-800">{nextDel.title}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {(() => { const d = dueBadge(nextDel.dueDate); return d ? <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${d.cls}`}>{d.label}</span> : null })()}
                <span className="text-xs text-slate-500">{nextDel.dueDate}</span>
                {nextDel.ownerMemberId && <span className="text-xs text-slate-400">· {getMemberName(project, nextDel.ownerMemberId)}</span>}
              </div>
              {(() => {
                const linked = project.tasks.filter(t => t.deliverableId === nextDel.id)
                const done = linked.filter(t => t.status === "DONE").length
                const pendingReviews = nextDel.reviews.filter(r => r.status === "pending").length
                return (
                  <div className="mt-2 text-xs text-slate-400 space-y-0.5">
                    <p>연결 업무 {linked.length}개 (완료 {done}개) · 요구사항 {nextDel.requirements.length}개</p>
                    {nextDel.submissionRecords.length > 0 && <p className="text-emerald-600 font-medium">제출 기록 {nextDel.submissionRecords.length}건</p>}
                    {pendingReviews > 0 && <p className="text-amber-600">검토 대기 {pendingReviews}건</p>}
                  </div>
                )
              })()}
            </button>
            {nextDels.length > 1 && (
              <p className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100">다음: {nextDels[1].title} ({nextDels[1].dueDate})</p>
            )}
          </div>
        ) : !isNewProject ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 p-4 flex flex-col items-center justify-center gap-2 text-center">
            <FileText size={20} className="text-slate-300" />
            <p className="text-sm text-slate-500">모든 제출물이 완료됐거나 아직 없습니다</p>
            <Btn size="sm" variant="secondary" onClick={() => setView("deliverables")}><Plus size={12} />제출물 등록</Btn>
          </div>
        ) : null}
      </div>

      {/* Needs attention */}
      {!isNewProject && (needsMinutes.length > 0 || upcomingMeetings.length > 0) && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-900 font-display mb-3 flex items-center gap-1.5">
            <CalendarClock size={15} className="text-blue-500" />일정·회의
          </h3>
          {needsMinutes.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-amber-700 mb-2">회의록 미작성</p>
              {needsMinutes.slice(0, 2).map(m => (
                <button key={m.id} onClick={() => openMeeting(m.id)}
                  className="w-full flex items-center gap-2 py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 rounded text-left -mx-1 px-1">
                  <AlertCircle size={13} className="text-amber-500 shrink-0" />
                  <span className="text-sm text-slate-700 flex-1 truncate">{m.title}</span>
                  <span className="text-xs text-slate-400 shrink-0">{m.date}</span>
                </button>
              ))}
            </div>
          )}
          {upcomingMeetings.length > 0 && (
            <>
              <p className="text-xs font-semibold text-slate-600 mb-2">예정 일정</p>
              {upcomingMeetings.map(m => (
                <button key={m.id} onClick={() => openMeeting(m.id)}
                  className="w-full flex items-center gap-2 py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-1 px-1 rounded text-left">
                  <CalendarDays size={13} className="text-blue-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 truncate">{m.title}</p>
                    <p className="text-xs text-slate-400">{m.date} {m.time}{m.location ? ` · ${m.location}` : ""}</p>
                  </div>
                  <ChevronRight size={13} className="text-slate-300 shrink-0" />
                </button>
              ))}
            </>
          )}
          <button onClick={() => setView("meetings")} className="text-xs text-blue-600 hover:underline mt-2 block">전체 일정 보기 →</button>
        </div>
      )}

      {/* Recent files */}
      {recentFiles.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
              <FolderOpen size={15} className="text-slate-400" />최근 자료
            </h3>
            <button onClick={() => setView("files")} className="text-xs text-blue-600 hover:underline">전체 →</button>
          </div>
          {recentFiles.map(f => (
            <div key={f.id} className="flex items-center gap-2 py-2.5 border-b border-slate-100 last:border-0">
              <FolderOpen size={13} className="text-slate-300 shrink-0" />
              <span className="text-sm text-slate-700 flex-1 truncate">{f.name}</span>
              <span className="text-xs text-slate-400 shrink-0">v{f.versions[0].version} · {fmtDate(f.versions[0].uploadedAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TASK DETAIL PANEL
// ═══════════════════════════════════════════════════════════════
function TaskDetailPanel({ task, project, onClose, onSave, onOpenMeeting, onOpenDeliverable, registerDirty }: {
  task: Task; project: Project; onClose: () => void; onSave: (t: Task) => boolean
  onOpenMeeting?: (id: string) => void; onOpenDeliverable?: (id: string) => void
  registerDirty?: (dirty: boolean, save: () => Promise<boolean>, discard: () => void) => void
}) {
  const [form, setForm] = useState(task)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [dirty, setDirty] = useState(false)

  // Reset when task changes
  useEffect(() => {
    setForm(task)
    setDirty(false)
    setSaved(false)
    setSaveError("")
  }, [task.id])

  const update = (patch: Partial<Task>) => {
    setForm(f => ({ ...f, ...patch }))
    setDirty(true)
    setSaved(false)
    setSaveError("")
  }

  const doSave = useCallback(async (): Promise<boolean> => {
    if (!form.title.trim()) { setSaveError("업무 이름을 입력해 주세요."); return false }
    setSaving(true); setSaveError("")
    await new Promise(r => setTimeout(r, 100))
    const ok = onSave({ ...form, updatedAt: new Date().toISOString() })
    setSaving(false)
    if (ok) { setSaved(true); setDirty(false); setTimeout(() => setSaved(false), 2000); return true }
    setSaveError("저장에 실패했습니다. 브라우저 저장 공간을 확인하고 다시 시도해 주세요.")
    return false
  }, [form, onSave])

  const discard = useCallback(() => {
    setForm(task); setDirty(false); setSaveError("")
  }, [task])

  useEffect(() => {
    registerDirty?.(dirty, doSave, discard)
    return () => { registerDirty?.(false, async () => true, () => {}) }
  }, [dirty, doSave, discard, registerDirty])

  const STATUSES: TaskStatus[] = ["TODO","IN_PROGRESS","DONE"]
  const selDel = project.deliverables.find(d => d.id === form.deliverableId)
  const sourceMeeting = form.meetingId ? project.meetings.find(m => m.id === form.meetingId) : null

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">업무 상세</p>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs text-emerald-600 flex items-center gap-1"><Check size={11} />저장됨</span>
          )}
          {dirty && (
            <Btn size="sm" onClick={doSave} disabled={saving}>
              {saving ? <><Loader2 size={12} className="animate-spin" />저장 중</> : "저장"}
            </Btn>
          )}
          <button onClick={onClose} className="p-1.5 rounded hover:bg-slate-100" aria-label="닫기">
            <X size={15} className="text-slate-400" />
          </button>
        </div>
      </div>
      <div className="px-4 py-4 space-y-4 flex-1 overflow-y-auto">
        {saveError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg flex items-start gap-2">
            <AlertCircle size={12} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              {saveError}
              <button onClick={doSave} className="underline ml-1 font-medium">다시 시도</button>
            </div>
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">업무 이름</label>
          <input value={form.title} onChange={e => update({ title: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">상태</label>
          <div className="flex gap-1.5">
            {STATUSES.map(s => {
              const c = statusCfg(s); const sel = form.status === s
              return (
                <button key={s} onClick={() => update({ status: s })}
                  className={`flex-1 text-xs font-medium py-1.5 rounded-lg border transition-all ${sel ? `${c.bg} ${c.text} ${c.border} ring-2 ring-blue-300 ring-offset-1` : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">설명 <span className="font-normal text-slate-400">(선택)</span></label>
          <textarea value={form.description} onChange={e => update({ description: e.target.value })} rows={2}
            placeholder="업무에 대한 추가 설명이나 맥락"
            className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">우선순위</label>
            <select value={form.priority} onChange={e => update({ priority: e.target.value as TaskPriority })}
              className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">없음</option>
              <option value="HIGH">높음</option>
              <option value="MEDIUM">보통</option>
              <option value="LOW">낮음</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">마감일</label>
            <input type="date" value={form.dueDate} onChange={e => update({ dueDate: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">담당자</label>
          <select value={form.assigneeMemberId} onChange={e => update({ assigneeMemberId: e.target.value, assigneeMemberIds: e.target.value ? [e.target.value] : [] })}
            className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">미지정</option>
            {project.members.filter(m => m.role !== "OBSERVER").map(m =>
              <option key={m.id} value={m.id}>{m.name}</option>
            )}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">연결 제출물</label>
          <select value={form.deliverableId} onChange={e => update({ deliverableId: e.target.value, requirementId: "" })}
            className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">없음</option>
            {project.deliverables.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
          {form.deliverableId && selDel && (
            <select value={form.requirementId} onChange={e => update({ requirementId: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm mt-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">요구사항 연결 안 함</option>
              {selDel.requirements.map(r =>
                <option key={r.id} value={r.id}>{r.required ? "[필수] " : ""}{r.content}</option>
              )}
            </select>
          )}
          {selDel && onOpenDeliverable && (
            <button onClick={() => onOpenDeliverable(selDel.id)}
              className="mt-1 text-xs text-blue-600 hover:underline flex items-center gap-1">
              <ExternalLink size={11} />{selDel.title} 보기
            </button>
          )}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">완료 기준</label>
          <textarea value={form.completionCriteria} onChange={e => update({ completionCriteria: e.target.value })} rows={3}
            placeholder="업무가 끝났다고 볼 수 있는 구체적인 조건"
            className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {sourceMeeting && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
            <p className="text-xs font-semibold text-blue-700 mb-1">회의에서 생성됨</p>
            <button onClick={() => onOpenMeeting?.(sourceMeeting.id)}
              className="text-xs text-blue-700 hover:underline flex items-center gap-1">
              <ExternalLink size={11} />{sourceMeeting.title} · {sourceMeeting.date}
            </button>
          </div>
        )}
        <div className="text-xs text-slate-400 pt-2 border-t border-slate-100 space-y-0.5">
          <p>마지막 수정: {fmtDateTime(form.updatedAt)}</p>
          <p>생성: {fmtDate(form.createdAt)}</p>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TASKS VIEW
// ═══════════════════════════════════════════════════════════════
function TasksView({ project, selectedTaskId, setSelectedTaskId, updateProject, onOpenMeeting, onOpenDeliverable, registerDirty }: {
  project: Project; selectedTaskId: string; setSelectedTaskId: (id: string) => void
  updateProject: (upd: (p: Project) => Project) => void
  onOpenMeeting?: (id: string) => void; onOpenDeliverable?: (id: string) => void
  registerDirty?: (dirty: boolean, save: () => Promise<boolean>, discard: () => void) => void
}) {
  const [viewMode, setViewMode] = useState<"list"|"board">("list")
  const [filter, setFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<TaskStatus|"ALL">("ALL")
  const [memberFilter, setMemberFilter] = useState("")
  const [quickFilter, setQuickFilter] = useState<"all"|"mine"|"week"|"unassigned"|"unlinked">("all")
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ title:"", assigneeMemberId:"", dueDate:"", deliverableId:"" })
  const [addError, setAddError] = useState("")

  const me = getMyMember(project)
  const todayStr = new Date().toISOString().slice(0, 10)
  const weekLater = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  const filtered = project.tasks.filter(t => {
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false
    if (memberFilter && t.assigneeMemberId !== memberFilter) return false
    if (quickFilter === "mine" && t.assigneeMemberId !== me?.id) return false
    if (quickFilter === "week" && (t.status === "DONE" || !t.dueDate || t.dueDate > weekLater)) return false
    if (quickFilter === "unassigned" && t.assigneeMemberId) return false
    if (quickFilter === "unlinked" && t.deliverableId) return false
    if (filter) {
      const q = filter.toLowerCase()
      if (!t.title.toLowerCase().includes(q) && !getMemberName(project, t.assigneeMemberId).toLowerCase().includes(q)) return false
    }
    return true
  })
  const selectedTask = project.tasks.find(t => t.id === selectedTaskId) ?? null

  const saveTask = (t: Task): boolean => {
    try {
      updateProject(p => addActivity({
        ...p,
        tasks: p.tasks.some(x => x.id === t.id) ? p.tasks.map(x => x.id === t.id ? t : x) : [...p.tasks, t],
      }, `업무 "${t.title}" 수정`))
      return true
    } catch { return false }
  }

  const handleAdd = () => {
    if (!addForm.title.trim()) { setAddError("업무 이름을 입력해 주세요."); return }
    const task: Task = {
      id: uid(), title: addForm.title.trim(), status: "TODO",
      assigneeMemberId: addForm.assigneeMemberId,
      assigneeMemberIds: addForm.assigneeMemberId ? [addForm.assigneeMemberId] : [],
      priority: "" as TaskPriority, description: "",
      dueDate: addForm.dueDate,
      completionCriteria: "", deliverableId: addForm.deliverableId, requirementId: "",
      meetingId: "", meetingItemId: "", updatedAt: new Date().toISOString(), createdAt: new Date().toISOString(),
    }
    updateProject(p => addActivity({ ...p, tasks: [...p.tasks, task] }, `업무 "${task.title}" 생성`))
    setAddForm({ title:"", assigneeMemberId:"", dueDate:"", deliverableId:"" })
    setShowAdd(false); setAddError("")
    setSelectedTaskId(task.id)
  }

  const COLS: TaskStatus[] = ["TODO","IN_PROGRESS","DONE"]

  return (
    <div className="flex h-full overflow-hidden">
      <div className={`flex flex-col overflow-hidden ${selectedTask ? "flex-1" : "w-full"}`}>
        {/* Toolbar */}
        <div className="px-4 py-2.5 border-b border-slate-200 bg-white flex items-center gap-2 flex-wrap shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="업무·담당자 검색"
              className="pl-8 pr-7 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-40" />
            {filter && (
              <button onClick={() => setFilter("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                <X size={12} />
              </button>
            )}
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
            className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="ALL">전체 상태</option>
            <option value="TODO">할 일</option>
            <option value="IN_PROGRESS">진행 중</option>
            <option value="DONE">업무 완료</option>
          </select>
          <select value={memberFilter} onChange={e => setMemberFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">전체 담당자</option>
            {project.members.filter(m => m.role !== "OBSERVER").map(m =>
              <option key={m.id} value={m.id}>{m.name}</option>
            )}
          </select>
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button onClick={() => setViewMode("list")}
              className={`px-2.5 py-1.5 transition-colors ${viewMode === "list" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}
              aria-label="목록 보기"><List size={14} /></button>
            <button onClick={() => setViewMode("board")}
              className={`px-2.5 py-1.5 transition-colors ${viewMode === "board" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}
              aria-label="보드 보기"><Columns size={14} /></button>
          </div>
          <Btn size="sm" onClick={() => setShowAdd(v => !v)} className="ml-auto"><Plus size={13} />업무 추가</Btn>
        </div>
        {/* Quick filters */}
        <div className="px-4 py-1.5 border-b border-slate-100 bg-slate-50 flex items-center gap-1.5 shrink-0 overflow-x-auto">
          {([["all","전체"],["mine","내 업무"],["week","이번 주"],["unassigned","담당자 미지정"],["unlinked","제출물 미연결"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setQuickFilter(key)}
              className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${quickFilter === key ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300"}`}>
              {label}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-400 shrink-0">{filtered.length}개</span>
        </div>

        {/* Quick add */}
        {showAdd && (
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-200 shrink-0">
            {addError && <p className="text-xs text-red-600 mb-2">{addError}</p>}
            <div className="flex gap-2 flex-wrap">
              <input value={addForm.title}
                onChange={e => { setAddForm(f => ({ ...f, title: e.target.value })); setAddError("") }}
                onKeyDown={e => e.key === "Enter" && handleAdd()}
                autoFocus placeholder="업무 이름 입력 후 Enter"
                className="flex-1 min-w-36 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              <select value={addForm.assigneeMemberId} onChange={e => setAddForm(f => ({ ...f, assigneeMemberId: e.target.value }))}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">담당자</option>
                {project.members.filter(m => m.role !== "OBSERVER").map(m =>
                  <option key={m.id} value={m.id}>{m.name}</option>
                )}
              </select>
              <input type="date" value={addForm.dueDate} onChange={e => setAddForm(f => ({ ...f, dueDate: e.target.value }))}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              <Btn size="sm" onClick={handleAdd}>추가</Btn>
              <Btn size="sm" variant="ghost" onClick={() => { setShowAdd(false); setAddError("") }}>취소</Btn>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-white">
          {project.tasks.length === 0 ? (
            <EmptyState icon={ClipboardList} title="업무가 없습니다"
              desc="업무를 추가하고 담당자와 기한을 지정하세요."
              action={<Btn onClick={() => setShowAdd(true)}><Plus size={14} />업무 추가</Btn>} />
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-400">
              조건에 맞는 업무가 없습니다.{" "}
              <button onClick={() => { setFilter(""); setStatusFilter("ALL"); setMemberFilter("") }}
                className="text-blue-600 hover:underline">초기화</button>
            </div>
          ) : viewMode === "list" ? (
            <div>
              {filtered.map(t => {
                const due = t.status !== "DONE" ? dueBadge(t.dueDate) : null
                const member = getMember(project, t.assigneeMemberId)
                const del = project.deliverables.find(d => d.id === t.deliverableId)
                const sel = selectedTaskId === t.id
                return (
                  <button key={t.id} onClick={() => setSelectedTaskId(sel ? "" : t.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0 text-left transition-colors ${sel ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                    <StatusBadge status={t.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{t.title}</p>
                      {del && <p className="text-xs text-blue-500 truncate mt-0.5">{del.title}</p>}
                    </div>
                    {member
                      ? <Avatar member={member} size={6} />
                      : <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium shrink-0">미지정</span>}
                    {due && <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${due.cls}`}>{due.label}</span>}
                    <ChevronRight size={13} className={`text-slate-300 shrink-0 ${sel ? "rotate-90" : ""}`} />
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="p-4 grid grid-cols-3 gap-3 items-start">
              {COLS.map(status => {
                const col = filtered.filter(t => t.status === status)
                const c = statusCfg(status)
                return (
                  <div key={status}>
                    <div className={`flex items-center gap-2 px-2.5 py-2 rounded-lg ${c.bg} border ${c.border} mb-2`}>
                      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                      <span className={`text-xs font-semibold ${c.text} flex-1`}>{c.label}</span>
                      <span className={`text-xs font-bold ${c.text}`}>{col.length}</span>
                    </div>
                    <div className="space-y-2">
                      {col.map(t => {
                        const due = t.status !== "DONE" ? dueBadge(t.dueDate) : null
                        const m = getMember(project, t.assigneeMemberId)
                        const sel = selectedTaskId === t.id
                        return (
                          <button key={t.id} onClick={() => setSelectedTaskId(sel ? "" : t.id)}
                            className={`w-full bg-white border rounded-lg p-2.5 text-left transition-all hover:shadow-sm ${sel ? "border-blue-400 ring-2 ring-blue-200" : "border-slate-200 hover:border-slate-300"}`}>
                            <p className="text-xs font-semibold text-slate-800 mb-2">{t.title}</p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {m ? <Avatar member={m} size={5} /> : <span className="text-xs text-amber-600">미지정</span>}
                              {due && <span className={`ml-auto text-xs px-1 py-0.5 rounded font-medium ${due.cls}`}>{due.label}</span>}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedTask && (
        <div className="w-80 shrink-0 border-l border-slate-200 overflow-hidden flex flex-col">
          <TaskDetailPanel
            task={selectedTask} project={project}
            onClose={() => setSelectedTaskId("")}
            onSave={saveTask}
            onOpenMeeting={onOpenMeeting}
            onOpenDeliverable={onOpenDeliverable}
            registerDirty={registerDirty} />
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SCHEDULE VIEW
// ═══════════════════════════════════════════════════════════════
function ScheduleView({ project, openTask, openMeeting, openDeliverable }: {
  project: Project
  openTask: (id: string) => void
  openMeeting: (id: string) => void
  openDeliverable: (id: string) => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  type Entry = { date: string; label: string; type:"meeting"|"task"|"deliverable"; id: string; sub?: string }
  const entries: Entry[] = []

  project.meetings.forEach(m => {
    entries.push({ date: m.date, label: m.title, type:"meeting", id: m.id, sub: m.time + (m.location ? ` · ${m.location}` : "") })
  })
  project.tasks.filter(t => t.dueDate && t.status !== "DONE").forEach(t => {
    entries.push({ date: t.dueDate, label: t.title, type:"task", id: t.id,
      sub: getMemberName(project, t.assigneeMemberId) })
  })
  project.deliverables.filter(d => d.dueDate).forEach(d => {
    entries.push({ date: d.dueDate, label: d.title, type:"deliverable", id: d.id,
      sub: d.submissionMethod || "제출 기한" })
  })

  entries.sort((a, b) => a.date.localeCompare(b.date))
  const upcoming = entries.filter(e => e.date >= today)
  const past = entries.filter(e => e.date < today)

  const typeMeta = {
    meeting:     { icon: CalendarClock, bg:"bg-blue-50",    text:"text-blue-600",    label:"회의" },
    task:        { icon: ClipboardList, bg:"bg-slate-50",   text:"text-slate-500",   label:"업무 마감" },
    deliverable: { icon: FileText,      bg:"bg-emerald-50", text:"text-emerald-600", label:"제출 기한" },
  }

  const renderEntry = (e: Entry, i: number) => {
    const m = typeMeta[e.type]
    const Icon = m.icon
    const due = e.type !== "meeting" ? dueBadge(e.date) : null
    const handler = () => {
      if (e.type === "meeting") openMeeting(e.id)
      else if (e.type === "task") openTask(e.id)
      else openDeliverable(e.id)
    }
    return (
      <button key={i} onClick={handler}
        className="w-full flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0 text-left hover:bg-slate-50 transition-colors">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.bg}`}>
          <Icon size={14} className={m.text} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{e.label}</p>
          <p className="text-xs text-slate-400 mt-0.5">{e.date} · {m.label}{e.sub ? ` · ${e.sub}` : ""}</p>
        </div>
        {due && <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${due.cls}`}>{due.label}</span>}
        <ChevronRight size={13} className="text-slate-300 shrink-0" />
      </button>
    )
  }

  if (entries.length === 0) {
    return (
      <EmptyState icon={CalendarDays} title="일정이 없습니다"
        desc="회의, 업무 마감일, 제출 기한이 등록되면 날짜순으로 표시됩니다." />
    )
  }

  return (
    <div className="space-y-4">
      {upcoming.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">예정 일정</p>
          </div>
          {upcoming.map(renderEntry)}
        </div>
      )}
      {past.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden opacity-60">
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">지난 일정</p>
          </div>
          {[...past].reverse().slice(0, 10).map(renderEntry)}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MEETINGS VIEW
// ═══════════════════════════════════════════════════════════════
function MeetingsView({ project, selectedMeetingId, setSelectedMeetingId, updateProject, openTask, openDeliverable, onAddTask }: {
  project: Project; selectedMeetingId: string; setSelectedMeetingId: (id: string) => void
  updateProject: (upd: (p: Project) => Project) => void
  openTask: (id: string) => void; openDeliverable: (id: string) => void; onAddTask: (t: Task) => void
}) {
  const [creating, setCreating] = useState(false)
  const [tab, setTab] = useState<"list"|"schedule">("list")

  if (creating) {
    return (
      <MeetingWizard project={project} onCancel={() => setCreating(false)}
        onDone={m => {
          updateProject(p => addActivity({ ...p, meetings: [m, ...p.meetings] }, `회의 "${m.title}" 생성`))
          setCreating(false)
          setSelectedMeetingId(m.id)
        }} />
    )
  }

  const sel = project.meetings.find(m => m.id === selectedMeetingId)
  if (sel) {
    return (
      <MeetingDetail meeting={sel} project={project}
        onBack={() => setSelectedMeetingId("")}
        onUpdate={m => updateProject(p => addActivity({
          ...p, meetings: p.meetings.map(x => x.id === m.id ? m : x),
        }, `회의록 "${m.title}" 저장`))}
        onAddTask={t => {
          onAddTask(t)
          updateProject(p => addActivity(p, `회의에서 업무 "${t.title}" 생성`))
        }}
        openTask={openTask} />
    )
  }

  return (
    <div className="p-5 space-y-4 max-w-2xl">
      <div className="flex items-center gap-2">
        <div className="flex border border-slate-200 rounded-lg overflow-hidden">
          <button onClick={() => setTab("list")}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${tab === "list" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
            회의 목록
          </button>
          <button onClick={() => setTab("schedule")}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${tab === "schedule" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
            일정 보기
          </button>
        </div>
        <span className="text-xs text-slate-400 ml-auto">{project.meetings.length}건</span>
        <Btn size="sm" onClick={() => setCreating(true)}><Plus size={13} />새 회의</Btn>
      </div>

      {tab === "schedule" ? (
        <ScheduleView project={project}
          openTask={openTask}
          openMeeting={setSelectedMeetingId}
          openDeliverable={openDeliverable} />
      ) : project.meetings.length === 0 ? (
        <EmptyState icon={CalendarClock} title="회의가 없습니다"
          desc="새 회의를 만들어 일정과 출석 코드를 관리하고 회의록을 작성하세요."
          action={<Btn onClick={() => setCreating(true)}><Plus size={14} />새 회의 만들기</Btn>} />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {[...project.meetings].sort((a, b) => b.date.localeCompare(a.date)).map(m => (
            <button key={m.id} onClick={() => setSelectedMeetingId(m.id)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors text-left">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <CalendarClock size={16} className="text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{m.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {m.date}{m.time ? ` ${m.time}` : ""}
                  {m.location ? ` · ${m.location}` : ""}
                  {" · "}출석 {m.checkedInMemberIds.length}/{m.attendeeMemberIds.length}명
                </p>
              </div>
              {m.hasMinutes ? (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">회의록 있음</span>
              ) : (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200 shrink-0">회의록 없음</span>
              )}
              <ChevronRight size={14} className="text-slate-300 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MEETING WIZARD
// ═══════════════════════════════════════════════════════════════
function MeetingWizard({ project, onCancel, onDone }: {
  project: Project; onCancel: () => void; onDone: (m: Meeting) => void
}) {
  const [step, setStep] = useState<1|2|3>(1)
  const [form, setForm] = useState({ title:"", location:"", date:"", time:"", useAI: false })
  const [selCandidate, setSelCandidate] = useState("")
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)

  const nonObservers = project.members.filter(m => m.role !== "OBSERVER")

  // Generate candidates from actual project members and future dates
  const candidates = useMemo(() => {
    const base = new Date()
    const days = ["일","월","화","수","목","금","토"]
    // Find next 3 weekdays starting 7 days from now
    const result = []
    let d = new Date(base)
    d.setDate(d.getDate() + 7)
    const times = ["10:00","14:00","16:30"]
    while (result.length < 3) {
      const dw = d.getDay()
      if (dw !== 0 && dw !== 6) { // skip weekends
        const dateStr = d.toISOString().slice(0, 10)
        result.push({
          id: `c${result.length + 1}`,
          date: dateStr,
          day: days[dw],
          time: times[result.length],
          avail: nonObservers.map(m => ({ memberId: m.id, status: "unknown" as const })),
        })
      }
      d.setDate(d.getDate() + 1)
    }
    return result
  }, [project.id, project.members.length])

  const candidate = candidates.find(c => c.id === selCandidate)
  const chosenDate = form.useAI ? (candidate?.date ?? "") : form.date
  const chosenTime = form.useAI ? (candidate?.time ?? "") : form.time

  const handleCreate = async () => {
    if (!form.title.trim()) return
    setCreating(true)
    await new Promise(r => setTimeout(r, 400))
    const code = `MT${Math.floor(1000 + Math.random() * 9000)}`
    const m: Meeting = {
      id: uid(), title: form.title.trim(), date: chosenDate, time: chosenTime,
      location: form.location,
      attendeeMemberIds: nonObservers.map(m => m.id),
      checkinCode: code, checkedInMemberIds: [],
      hasMinutes: false, minutesContent: "", aiSummary: null, manualActionItems: [],
      createdAt: new Date().toISOString(),
    }
    setCreating(false)
    onDone(m)
  }

  const steps = ["기본 정보","일정 선택","확인"]

  return (
    <div className="p-5 max-w-xl">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={onCancel} className="p-1.5 rounded hover:bg-slate-100 text-slate-500">
          <ArrowLeft size={15} />
        </button>
        <div className="flex items-center gap-1.5 flex-1">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step > i + 1 ? "bg-emerald-500 text-white" : step === i + 1 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                {step > i + 1 ? <Check size={12} /> : i + 1}
              </div>
              <span className={`text-xs ${step === i + 1 ? "text-blue-700 font-semibold" : "text-slate-400"}`}>{s}</span>
              {i < 2 && <ChevronRight size={12} className="text-slate-300" />}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        {step === 1 && (
          <>
            <h2 className="text-base font-bold text-slate-900 font-display">회의 기본 정보</h2>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">회의 제목 *</label>
              <input autoFocus value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="예: 중간발표 최종 점검"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <MapPin size={11} className="text-slate-400" />장소
              </label>
              <input value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="예: 도서관 3층 스터디룸"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                참석자: {nonObservers.length > 0 ? nonObservers.map(m => m.name).join(", ") : "팀원이 없습니다"}
              </p>
            </div>
            <div className="flex justify-end">
              <Btn onClick={() => setStep(2)} disabled={!form.title.trim()}>
                다음 <ChevronRight size={13} />
              </Btn>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 font-display">일정 선택</h2>
              {nonObservers.length > 0 && (
                <div className="flex gap-1.5">
                  <button onClick={() => setForm(f => ({ ...f, useAI: false }))}
                    className={`text-xs px-2.5 py-1.5 rounded-lg font-medium ${!form.useAI ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    직접 입력
                  </button>
                  <button onClick={() => setForm(f => ({ ...f, useAI: true }))}
                    className={`text-xs px-2.5 py-1.5 rounded-lg font-medium ${form.useAI ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    <Sparkles size={11} className="inline mr-1" />후보 제안
                  </button>
                </div>
              )}
            </div>

            {form.useAI ? (
              <div className="space-y-2">
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
                  <Info size={12} className="text-amber-500 mt-0.5 shrink-0" />
                  아래 후보는 프로젝트 마감일 기준 7일 후부터의 평일입니다. 팀원 실제 일정은 직접 확인하세요.
                </div>
                {candidates.map(c => {
                  const sel = selCandidate === c.id
                  return (
                    <div key={c.id} onClick={() => setSelCandidate(c.id)}
                      className={`rounded-xl border-2 p-3.5 cursor-pointer transition-all ${sel ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${sel ? "border-blue-600 bg-blue-600" : "border-slate-300"}`}>
                          {sel && <Check size={11} className="text-white" />}
                        </div>
                        <span className="font-bold text-sm text-slate-900">{c.date} ({c.day}) {c.time}</span>
                        <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">일정 미확인</span>
                      </div>
                      <div className="ml-7 space-y-1">
                        {c.avail.map(a => {
                          const member = getMember(project, a.memberId)
                          if (!member) return null
                          return (
                            <div key={a.memberId} className="flex items-center gap-2 text-xs">
                              <Avatar member={member} size={4} />
                              <span className="text-slate-700">{member.name}</span>
                              <span className="text-slate-400">일정 정보 없음</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">날짜</label>
                  <input type="date" value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    min={new Date().toISOString().slice(0, 10)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">시작 시간</label>
                  <input type="time" value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            )}

            <div className="flex justify-between pt-1">
              <Btn variant="secondary" onClick={() => setStep(1)}><ChevronLeft size={13} />이전</Btn>
              <Btn onClick={() => setStep(3)}
                disabled={form.useAI ? !selCandidate : (!form.date || !form.time)}>
                다음 <ChevronRight size={13} />
              </Btn>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-base font-bold text-slate-900 font-display">확인 및 생성</h2>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
              {[
                ["제목", form.title],
                ["날짜·시간", chosenDate && chosenTime ? `${chosenDate} ${chosenTime}` : "미설정"],
                ["장소", form.location || "미설정"],
                ["참석 대상", nonObservers.map(m => m.name).join(", ") || "없음"],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3 items-start">
                  <span className="text-slate-400 w-20 shrink-0 text-xs pt-0.5">{k}</span>
                  <span className="font-medium text-slate-900 text-sm">{v}</span>
                </div>
              ))}
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-500 flex items-start gap-2">
              <Info size={12} className="text-slate-400 mt-0.5 shrink-0" />
              생성 후 출석 코드가 발급됩니다. 팀원에게 공유해 출석 체크에 사용하세요.
            </div>
            <div className="flex justify-between">
              <Btn variant="secondary" onClick={() => setStep(2)}><ChevronLeft size={13} />이전</Btn>
              <Btn onClick={handleCreate} disabled={creating || !chosenDate || !chosenTime}>
                {creating ? <><Loader2 size={13} className="animate-spin" />생성 중…</> : "회의 생성"}
              </Btn>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MEETING DETAIL
// ═══════════════════════════════════════════════════════════════
function MeetingDetail({ meeting, project, onBack, onUpdate, onAddTask, openTask }: {
  meeting: Meeting; project: Project; onBack: () => void
  onUpdate: (m: Meeting) => void; onAddTask: (t: Task) => void; openTask: (id: string) => void
}) {
  const [editingMinutes, setEditingMinutes] = useState(false)
  const [draft, setDraft] = useState(meeting.minutesContent)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [saved, setSaved] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [checkinInput, setCheckinInput] = useState("")
  const [checkinExpanded, setCheckinExpanded] = useState(
    meeting.checkedInMemberIds.length < meeting.attendeeMemberIds.length
  )
  const [copied, setCopied] = useState(false)
  const [newItemTask, setNewItemTask] = useState("")
  const [newItemAssignee, setNewItemAssignee] = useState("")
  const [newItemDue, setNewItemDue] = useState("")
  const [convertingId, setConvertingId] = useState<string|null>(null)

  useEffect(() => {
    setDraft(meeting.minutesContent)
    setSaved(false)
    setSaveError("")
    setEditingMinutes(false)
  }, [meeting.id])

  const handleSaveMinutes = async () => {
    setSaving(true); setSaveError("")
    await new Promise(r => setTimeout(r, 300))
    try {
      onUpdate({ ...meeting, minutesContent: draft, hasMinutes: !!draft.trim() })
      setSaving(false); setSaved(true); setEditingMinutes(false)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setSaving(false)
      setSaveError("저장에 실패했습니다. 브라우저 저장 공간을 확인해 주세요.")
    }
  }

  const handleCheckin = () => {
    const code = checkinInput.trim().toUpperCase()
    if (code !== meeting.checkinCode) { alert("코드가 일치하지 않습니다."); return }
    const me = getMyMember(project)
    if (me && !meeting.checkedInMemberIds.includes(me.id)) {
      onUpdate({ ...meeting, checkedInMemberIds: [...meeting.checkedInMemberIds, me.id] })
    }
    setCheckinInput(""); setCheckinExpanded(false)
  }

  const convertAIItem = (item: MeetingActionItem) => {
    if (item.taskId) { openTask(item.taskId); return }
    const t: Task = {
      id: uid(), title: item.task, status: "TODO", assigneeMemberId: item.assigneeMemberId,
      assigneeMemberIds: item.assigneeMemberId ? [item.assigneeMemberId] : [],
      priority: "" as TaskPriority, description: "",
      dueDate: item.dueDate, completionCriteria: "", deliverableId: "", requirementId: "",
      meetingId: meeting.id, meetingItemId: item.id,
      updatedAt: new Date().toISOString(), createdAt: new Date().toISOString(),
    }
    onAddTask(t)
    onUpdate({
      ...meeting,
      aiSummary: meeting.aiSummary ? {
        ...meeting.aiSummary,
        actionItems: meeting.aiSummary.actionItems.map(a => a.id === item.id ? { ...a, taskId: t.id } : a),
      } : null,
    })
  }

  const addManualItem = () => {
    if (!newItemTask.trim()) return
    const item: MeetingActionItem = {
      id: uid(), task: newItemTask.trim(), assigneeMemberId: newItemAssignee,
      dueDate: newItemDue, taskId: "",
    }
    onUpdate({ ...meeting, manualActionItems: [...meeting.manualActionItems, item] })
    setNewItemTask(""); setNewItemAssignee(""); setNewItemDue("")
  }

  const convertManualItem = (item: MeetingActionItem) => {
    if (item.taskId) { openTask(item.taskId); return }
    setConvertingId(item.id)
    const t: Task = {
      id: uid(), title: item.task, status: "TODO", assigneeMemberId: item.assigneeMemberId,
      assigneeMemberIds: item.assigneeMemberId ? [item.assigneeMemberId] : [],
      priority: "" as TaskPriority, description: "",
      dueDate: item.dueDate, completionCriteria: "", deliverableId: "", requirementId: "",
      meetingId: meeting.id, meetingItemId: item.id,
      updatedAt: new Date().toISOString(), createdAt: new Date().toISOString(),
    }
    onAddTask(t)
    onUpdate({
      ...meeting,
      manualActionItems: meeting.manualActionItems.map(a => a.id === item.id ? { ...a, taskId: t.id } : a),
    })
    setTimeout(() => setConvertingId(null), 500)
  }

  const nonObservers = project.members.filter(m => m.role !== "OBSERVER")

  return (
    <div className="p-5 max-w-2xl space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-blue-600 mb-1">
        <ChevronLeft size={14} />회의 목록으로
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="text-xl font-bold text-slate-900 font-display">{meeting.title}</h2>
          {saved && <span className="text-xs text-emerald-600 flex items-center gap-1 shrink-0"><Check size={11} />저장됨</span>}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><Calendar size={11} />{meeting.date}{meeting.time ? ` ${meeting.time}` : ""}</span>
          <span className="flex items-center gap-1"><MapPin size={11} />{meeting.location || "장소 미정"}</span>
          <span className="flex items-center gap-1"><Users size={11} />출석 {meeting.checkedInMemberIds.length}/{meeting.attendeeMemberIds.length}명</span>
        </div>
      </div>

      {/* Check-in */}
      <div className="bg-white rounded-xl border border-slate-200">
        <button onClick={() => setCheckinExpanded(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left">
          <div className="flex items-center gap-2">
            <UserCheck size={14} className="text-blue-500" />
            <span className="text-sm font-semibold text-slate-900">출석 체크인</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {meeting.checkedInMemberIds.length}/{meeting.attendeeMemberIds.length}명
            </span>
          </div>
          {checkinExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </button>
        {checkinExpanded && (
          <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4">
            <div className="flex items-center justify-between bg-blue-50 rounded-xl px-4 py-3">
              <div>
                <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide">출석 코드</p>
                <p className="text-2xl font-bold text-blue-900 font-display tracking-widest mt-0.5">{meeting.checkinCode}</p>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(meeting.checkinCode); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                className="flex items-center gap-1.5 text-sm text-blue-700 bg-white border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 font-medium">
                {copied ? <><Check size={12} className="text-emerald-600" />복사됨</> : <><Copy size={12} />복사</>}
              </button>
            </div>
            <div className="space-y-1.5">
              {meeting.attendeeMemberIds.map(id => {
                const m = getMember(project, id)
                if (!m) return null
                const checked = meeting.checkedInMemberIds.includes(id)
                return (
                  <div key={id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm ${checked ? "bg-emerald-50" : "bg-slate-50"}`}>
                    <Avatar member={m} size={5} />
                    <span className={checked ? "text-emerald-800 font-medium flex-1" : "text-slate-600 flex-1"}>{m.name}</span>
                    {checked ? <CheckCircle size={14} className="text-emerald-500" /> : <Circle size={14} className="text-slate-300" />}
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2">
              <input value={checkinInput}
                onChange={e => setCheckinInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && handleCheckin()}
                placeholder={`코드 입력 (예: ${meeting.checkinCode})`}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <Btn onClick={handleCheckin}>체크인</Btn>
            </div>
          </div>
        )}
      </div>

      {/* Minutes */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
            <MessageSquare size={13} className="text-slate-400" />회의록
          </h3>
          {!editingMinutes ? (
            <Btn size="sm" onClick={() => setEditingMinutes(true)}>
              <Pencil size={12} />{meeting.hasMinutes ? "수정" : "작성 시작"}
            </Btn>
          ) : (
            <div className="flex gap-1.5">
              <Btn size="sm" variant="secondary"
                onClick={() => { setEditingMinutes(false); setDraft(meeting.minutesContent); setSaveError("") }}>
                취소
              </Btn>
              <Btn size="sm" onClick={handleSaveMinutes} disabled={saving}>
                {saving ? <><Loader2 size={12} className="animate-spin" />저장 중…</> : "저장"}
              </Btn>
            </div>
          )}
        </div>
        {saveError && (
          <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle size={13} className="text-red-500 mt-0.5 shrink-0" />
            <div>{saveError} <button onClick={handleSaveMinutes} className="underline font-medium">다시 시도</button></div>
          </div>
        )}
        {editingMinutes ? (
          <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={12}
            placeholder={"## 안건 제목\n\n내용을 작성하세요.\n\n- 항목"}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500" />
        ) : meeting.hasMinutes ? (
          <div className="space-y-0.5">{renderMarkdown(meeting.minutesContent)}</div>
        ) : (
          <p className="text-sm text-slate-400 italic text-center py-8">
            아직 회의록이 없습니다. '작성 시작'을 눌러 내용을 기록하세요.
          </p>
        )}
      </div>

      {/* Manual action items */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-900 font-display mb-1">결정사항 · 후속 업무</h3>
        <p className="text-xs text-slate-400 mb-4">회의에서 결정한 사항을 기록하고 업무로 전환하세요. AI 없이 직접 입력합니다.</p>
        {meeting.manualActionItems.length > 0 && (
          <div className="divide-y divide-slate-100 mb-4">
            {meeting.manualActionItems.map(item => {
              const m = getMember(project, item.assigneeMemberId)
              const isConverting = convertingId === item.id
              return (
                <div key={item.id} className="py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{item.task}</p>
                    {(m || item.dueDate) && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {m?.name ?? ""}{m && item.dueDate ? " · " : ""}{item.dueDate || ""}
                      </p>
                    )}
                  </div>
                  {item.taskId ? (
                    <button onClick={() => openTask(item.taskId)}
                      className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 shrink-0 hover:bg-emerald-100">
                      <Check size={11} />업무 보기
                    </button>
                  ) : (
                    <button onClick={() => convertManualItem(item)} disabled={isConverting}
                      className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 shrink-0">
                      {isConverting ? <Loader2 size={12} className="animate-spin" /> : "업무로 전환"}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <div className="border border-slate-200 rounded-lg p-3 space-y-2">
          <input value={newItemTask} onChange={e => setNewItemTask(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addManualItem()}
            placeholder="결정사항 또는 할 일 입력"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="flex gap-2 flex-wrap">
            <select value={newItemAssignee} onChange={e => setNewItemAssignee(e.target.value)}
              className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">담당자 선택</option>
              {nonObservers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input type="date" value={newItemDue} onChange={e => setNewItemDue(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>
          <Btn size="sm" onClick={addManualItem} disabled={!newItemTask.trim()}>
            <Plus size={13} />추가
          </Btn>
        </div>
      </div>

      {/* AI Summary */}
      {meeting.aiSummary && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-violet-500" />
              <h3 className="text-sm font-bold text-slate-900 font-display">AI 요약 초안</h3>
              <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-medium">검토 필요</span>
            </div>
            <button onClick={() => setShowAI(v => !v)} className="text-xs text-slate-400 hover:text-blue-600">
              {showAI ? "접기" : "펼치기"}
            </button>
          </div>
          {showAI ? (
            <div className="space-y-4 animate-fade-in">
              <div className="text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
                원문 회의록과 대조하여 검토한 뒤 업무로 전환하세요. AI 제안은 자동으로 확정되지 않습니다.
              </div>
              {meeting.aiSummary.keyDecisions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2">결정 사항</p>
                  <ul className="space-y-1">
                    {meeting.aiSummary.keyDecisions.map((d, i) => (
                      <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                        <CheckCircle size={12} className="text-emerald-500 mt-0.5 shrink-0" />{d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">후속 업무 제안</p>
                <div className="space-y-2">
                  {meeting.aiSummary.actionItems.map(item => {
                    const m = getMember(project, item.assigneeMemberId)
                    return (
                      <div key={item.id} className="border border-slate-200 rounded-lg px-3 py-2.5 flex items-start gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-800">{item.task}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            담당 제안: {m?.name ?? "미지정"} · {item.dueDate || "기한 없음"}
                          </p>
                        </div>
                        {item.taskId ? (
                          <button onClick={() => openTask(item.taskId)}
                            className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 hover:bg-emerald-100">
                            <Check size={11} />업무 보기
                          </button>
                        ) : (
                          <button onClick={() => convertAIItem(item)}
                            className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">
                            업무로 추가
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAI(true)} className="text-sm text-blue-600 hover:underline">
              결정 사항 {meeting.aiSummary.keyDecisions.length}개 · 후속 업무 {meeting.aiSummary.actionItems.length}개 보기 →
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// FILES VIEW
// ═══════════════════════════════════════════════════════════════
function FilesView({ project, updateProject }: {
  project: Project; updateProject: (upd: (p: Project) => Project) => void
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [showUpload, setShowUpload] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File|null>(null)
  const [uploadNote, setUploadNote] = useState("")
  const [versionChoice, setVersionChoice] = useState<"new"|"version">("new")
  const [existingForVersion, setExistingForVersion] = useState<FileGroup|null>(null)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<{ msg:string; type:"success"|"error" }|null>(null)
  const [search, setSearch] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const me = getMyMember(project)
  const myId = me?.id ?? ""

  const filtered = project.files.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) { setSelectedFile(null); return }
    setSelectedFile(file)
    const existing = project.files.find(f => f.name === file.name)
    setExistingForVersion(existing ?? null)
    setVersionChoice(existing ? "version" : "new")
  }

  const resetUpload = () => {
    setShowUpload(false); setSelectedFile(null); setUploadNote("")
    setExistingForVersion(null); setVersionChoice("new")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleUpload = () => {
    if (!selectedFile) return
    setUploading(true)
    const reader = new FileReader()
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string
      const fileDataKey = `file_${uid()}`
      const stored = storeFileData(fileDataKey, dataUrl)
      if (!stored) {
        setUploading(false)
        setToast({ msg:"브라우저 저장 공간 부족으로 파일을 저장하지 못했습니다. 저장 공간을 확보한 뒤 다시 시도해 주세요.", type:"error" })
        return
      }
      const bytes = selectedFile.size
      const sizeStr = bytes >= 1024 * 1024
        ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
        : `${Math.max(1, Math.round(bytes / 1024))} KB`

      const newVersion: FileVersion = {
        version: 1, uploadedByMemberId: myId, uploadedAt: new Date().toISOString(),
        size: sizeStr, changeNote: uploadNote || (versionChoice === "new" ? "초안 업로드" : "새 버전 업로드"),
        changeType: versionChoice === "new" ? "new" : "modified", fileDataKey,
      }

      updateProject(p => {
        let updated: Project
        if (versionChoice === "version" && existingForVersion) {
          updated = {
            ...p, files: p.files.map(f => f.id === existingForVersion.id
              ? { ...f, versions: [{ ...newVersion, version: f.versions[0].version + 1 }, ...f.versions] }
              : f),
          }
        } else {
          updated = { ...p, files: [{ id:uid(), name:selectedFile.name, category:"기타", versions:[newVersion] }, ...p.files] }
        }
        return addActivity(updated, `자료 "${selectedFile.name}" ${versionChoice === "version" ? "새 버전" : ""} 등록`)
      })
      setUploading(false)
      setToast({ msg:`"${selectedFile.name}"을 등록했습니다. 이 기기에서 다운로드할 수 있습니다.`, type:"success" })
      resetUpload()
    }
    reader.onerror = () => {
      setUploading(false)
      setToast({ msg:"파일을 읽을 수 없습니다. 다시 시도해 주세요.", type:"error" })
    }
    reader.readAsDataURL(selectedFile)
  }

  const handleDownload = (fg: FileGroup, v: FileVersion) => {
    if (!v.fileDataKey) {
      setToast({ msg:"이 파일은 예시 데이터입니다. 파일을 직접 등록하면 다운로드할 수 있습니다.", type:"error" })
      return
    }
    const dataUrl = getFileData(v.fileDataKey)
    if (!dataUrl) {
      setToast({ msg:"파일 데이터를 찾을 수 없습니다. 브라우저 데이터가 삭제됐을 수 있습니다.", type:"error" })
      return
    }
    const a = document.createElement("a"); a.href = dataUrl; a.download = fg.name; a.click()
  }

  return (
    <div className="p-5 space-y-4">
      {toast && <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="파일 검색"
            className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-44" />
        </div>
        <span className="text-xs text-slate-400 ml-auto">{project.files.length}개</span>
        <Btn size="sm" onClick={() => setShowUpload(v => !v)}><Upload size={13} />파일 등록</Btn>
      </div>

      {showUpload && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-800">파일 등록</p>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-600 flex items-start gap-2">
            <Info size={12} className="text-slate-400 mt-0.5 shrink-0" />
            선택한 파일은 이 브라우저에 저장되며 이 기기에서만 다운로드할 수 있습니다.
            브라우저 데이터를 지우면 삭제될 수 있습니다. 큰 파일은 저장 공간 제한에 걸릴 수 있습니다.
          </div>
          <input ref={fileInputRef} type="file" onChange={handleFileChange}
            className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-200 file:text-xs file:font-medium file:bg-white file:text-slate-700 hover:file:bg-slate-50 cursor-pointer" />
          {selectedFile && (
            <div className="space-y-2">
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 flex items-center gap-2">
                <FileText size={12} className="text-slate-400 shrink-0" />
                <span className="font-medium">{selectedFile.name}</span>
                <span className="text-slate-400 ml-auto">
                  {selectedFile.size >= 1024 * 1024
                    ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB`
                    : `${Math.round(selectedFile.size / 1024)} KB`}
                </span>
              </div>
              {existingForVersion && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-700">같은 이름의 파일이 있습니다</p>
                  <div className="flex gap-2">
                    <button onClick={() => setVersionChoice("version")}
                      className={`flex-1 text-xs py-2 rounded-lg border transition-all ${versionChoice === "version" ? "bg-blue-50 border-blue-300 text-blue-700 font-medium" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      기존 파일의 새 버전
                    </button>
                    <button onClick={() => setVersionChoice("new")}
                      className={`flex-1 text-xs py-2 rounded-lg border transition-all ${versionChoice === "new" ? "bg-blue-50 border-blue-300 text-blue-700 font-medium" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      새 자료로 등록
                    </button>
                  </div>
                </div>
              )}
              <input value={uploadNote} onChange={e => setUploadNote(e.target.value)}
                placeholder="변경 내용 메모 (선택)"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Btn size="sm" variant="secondary" onClick={resetUpload}>취소</Btn>
            <Btn size="sm" onClick={handleUpload} disabled={!selectedFile || uploading}>
              {uploading ? <><Loader2 size={12} className="animate-spin" />등록 중…</> : <><Upload size={13} />등록</>}
            </Btn>
          </div>
        </div>
      )}

      {project.files.length === 0 ? (
        <EmptyState icon={FolderOpen} title="등록된 자료가 없습니다"
          desc="발표자료, 보고서 등을 등록하면 버전 이력을 관리할 수 있습니다."
          action={<Btn onClick={() => setShowUpload(true)}><Upload size={14} />첫 파일 등록</Btn>} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-sm text-slate-400">검색 결과가 없습니다.</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_100px_110px_64px] gap-2 px-4 py-2.5 text-xs font-semibold text-slate-500 border-b border-slate-100 bg-slate-50">
            <span>파일명</span><span>최신 버전</span><span>등록자</span><span>등록 일시</span><span></span>
          </div>
          {filtered.map(f => {
            const latest = f.versions[0]
            const uploader = getMember(project, latest.uploadedByMemberId)
            const exp = !!expanded[f.id]
            const canDownload = !!latest.fileDataKey
            return (
              <div key={f.id} className="border-b border-slate-100 last:border-0">
                <div className="grid grid-cols-[1fr_80px_100px_110px_64px] gap-2 px-4 py-3 items-center hover:bg-slate-50 cursor-pointer"
                  onClick={() => setExpanded(e => ({ ...e, [f.id]: !e[f.id] }))}>
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={14} className="text-blue-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{f.name}</p>
                      <p className="text-xs text-slate-400">{f.category}</p>
                    </div>
                  </div>
                  <span className="text-sm text-blue-700 font-bold">v{latest.version}</span>
                  <span className="text-xs text-slate-600 truncate">{uploader?.name ?? "알 수 없음"}</span>
                  <span className="text-xs text-slate-400">{fmtDate(latest.uploadedAt)}</span>
                  <div className="flex items-center gap-0.5">
                    <button onClick={e => { e.stopPropagation(); handleDownload(f, latest) }}
                      className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${canDownload ? "text-blue-600" : "text-slate-300"}`}
                      aria-label="최신 버전 다운로드"
                      title={canDownload ? "다운로드" : "데모 파일 (다운로드 불가)"}>
                      <Download size={13} />
                    </button>
                    {exp ? <ChevronUp size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />}
                  </div>
                </div>
                {exp && (
                  <div className="bg-slate-50 border-t border-slate-100 animate-fade-in">
                    {f.versions.map(v => {
                      const vm = getMember(project, v.uploadedByMemberId)
                      const isLatest = v.version === f.versions[0].version
                      const ctCls = v.changeType === "new" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                      const ctLabel = v.changeType === "new" ? "신규" : "수정됨"
                      return (
                        <div key={v.version} className="px-6 py-3 flex items-center gap-3 border-b border-slate-100 last:border-0">
                          <div className="w-14 flex items-center gap-1 shrink-0">
                            {isLatest && <span className="text-[10px] bg-blue-600 text-white px-1 py-0.5 rounded font-bold">최신</span>}
                            <span className="text-xs font-bold text-slate-500">v{v.version}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-700">{v.changeNote}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ctCls}`}>{ctLabel}</span>
                              <span className="text-xs text-slate-400">{vm?.name ?? "알 수 없음"} · {v.size} · {fmtDateTime(v.uploadedAt)}</span>
                            </div>
                          </div>
                          <button onClick={() => handleDownload(f, v)}
                            disabled={!v.fileDataKey}
                            className={`text-xs flex items-center gap-1 shrink-0 px-2 py-1 rounded hover:bg-white transition-colors ${v.fileDataKey ? "text-blue-600" : "text-slate-300 cursor-default"}`}
                            title={!v.fileDataKey ? "데모 파일은 다운로드할 수 없습니다" : undefined}>
                            <Download size={11} />다운로드
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      <p className="text-xs text-slate-400 flex items-center gap-1.5">
        <Info size={11} />파일은 브라우저 로컬 저장소에 보관됩니다. 서버에는 업로드되지 않습니다.
      </p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// CREATE TASK FROM REQUIREMENT
// ═══════════════════════════════════════════════════════════════
function CreateTaskFromReqModal({ project, deliverable, requirement, onClose, onCreate }: {
  project: Project; deliverable: Deliverable; requirement: Requirement
  onClose: () => void; onCreate: (t: Task) => void
}) {
  const [form, setForm] = useState({
    title: requirement.content,
    assigneeMemberId: deliverable.ownerMemberId ?? "",
    dueDate: deliverable.dueDate,
    completionCriteria: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const titleRef = useRef<HTMLInputElement>(null)
  useEffect(() => { titleRef.current?.focus(); titleRef.current?.select() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { setError("업무 이름을 입력해 주세요."); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 200))
    const t: Task = {
      id: uid(), title: form.title.trim(), status: "TODO",
      assigneeMemberId: form.assigneeMemberId,
      assigneeMemberIds: form.assigneeMemberId ? [form.assigneeMemberId] : [],
      priority: "" as TaskPriority, description: "",
      dueDate: form.dueDate,
      completionCriteria: form.completionCriteria,
      deliverableId: deliverable.id, requirementId: requirement.id,
      meetingId: "", meetingItemId: "",
      updatedAt: new Date().toISOString(), createdAt: new Date().toISOString(),
    }
    onCreate(t)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <form onSubmit={handleCreate} className="relative w-full max-w-md bg-white rounded-xl shadow-xl p-6 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 font-display">요구사항에서 업무 만들기</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-slate-100">
            <X size={16} className="text-slate-500" />
          </button>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800">
          <span className="font-semibold">{deliverable.title}</span>
          {" · "}
          <span className={requirement.required ? "text-blue-700 font-semibold" : ""}>{requirement.required ? "[필수] " : ""}{requirement.content}</span>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg flex items-center gap-1.5">
            <AlertCircle size={11} className="shrink-0" />{error}
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">업무 이름 *</label>
          <input ref={titleRef} value={form.title}
            onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setError("") }}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">담당자</label>
            <select value={form.assigneeMemberId} onChange={e => setForm(f => ({ ...f, assigneeMemberId: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">미지정</option>
              {project.members.filter(m => m.role !== "OBSERVER").map(m =>
                <option key={m.id} value={m.id}>{m.name}</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">마감일</label>
            <input type="date" value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">완료 기준 <span className="text-slate-400 font-normal">(선택)</span></label>
          <textarea value={form.completionCriteria} onChange={e => setForm(f => ({ ...f, completionCriteria: e.target.value }))} rows={2}
            placeholder="업무가 끝났다고 볼 수 있는 구체적인 조건"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex justify-end gap-2">
          <Btn variant="secondary" type="button" onClick={onClose}>취소</Btn>
          <Btn type="submit" disabled={saving || !form.title.trim()}>
            {saving ? <><Loader2 size={12} className="animate-spin" />생성 중…</> : "업무 만들기"}
          </Btn>
        </div>
      </form>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// DELIVERABLES VIEW
// ═══════════════════════════════════════════════════════════════
type DelTab = "overview"|"tasks"|"files"|"review"

function DeliverablesView({ project, selectedId, setSelectedId, updateProject, openTask }: {
  project: Project; selectedId: string; setSelectedId: (id: string) => void
  updateProject: (upd: (p: Project) => Project) => void; openTask: (id: string) => void
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ title:"", dueDate:"", ownerMemberId:"", submissionMethod:"", description:"" })
  const [addError, setAddError] = useState("")
  const [savingAdd, setSavingAdd] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState<Deliverable|null>(null)
  const [newReq, setNewReq] = useState("")
  const [reqRequired, setReqRequired] = useState(true)
  const [editReq, setEditReq] = useState<{ id:string; content:string; required:boolean }|null>(null)
  const [linkTaskId, setLinkTaskId] = useState("")
  const [toast, setToast] = useState<{ msg:string; type:"success"|"error" }|null>(null)
  const [createTaskReq, setCreateTaskReq] = useState<Requirement|null>(null)
  const [delTab, setDelTab] = useState<DelTab>("overview")
  // Review form
  const [reviewForm, setReviewForm] = useState({ fileGroupId:"", fileVersion:0, reviewerMemberId:"", comment:"" })
  const [showReviewForm, setShowReviewForm] = useState(false)
  // Submission form
  const [showSubForm, setShowSubForm] = useState(false)
  const [subForm, setSubForm] = useState({ fileGroupId:"", fileVersion:0, submissionPath:"", note:"", confirmedBy:"" })

  const showToast = (msg: string, type: "success"|"error" = "success") => setToast({ msg, type })
  const me = getMyMember(project)
  const isObserver = me?.role === "OBSERVER"

  const selectedRaw = project.deliverables.find(d => d.id === selectedId)
  const selected = selectedRaw ? {
    ...selectedRaw,
    requirements: selectedRaw.requirements ?? [],
    reviews: selectedRaw.reviews ?? [],
    submissionRecords: selectedRaw.submissionRecords ?? [],
  } : undefined
  const linkedTasks = project.tasks.filter(t => t.deliverableId === selectedId)
  const unlinkedTasks = project.tasks.filter(t => !t.deliverableId)

  useEffect(() => {
    if (selected && editMode) setEditForm({ ...selected })
  }, [selected?.id])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addForm.title.trim()) { setAddError("제출물 이름을 입력해 주세요."); return }
    if (!addForm.dueDate) { setAddError("제출 기한은 필수입니다."); return }
    setSavingAdd(true)
    await new Promise(r => setTimeout(r, 200))
    const d: Deliverable = {
      id: uid(), title: addForm.title.trim(), dueDate: addForm.dueDate,
      ownerMemberId: addForm.ownerMemberId, submissionMethod: addForm.submissionMethod,
      description: addForm.description, requirements: [], status: "PREPARING",
      reviews: [], submissionRecords: [],
    }
    updateProject(p => addActivity({ ...p, deliverables: [...p.deliverables, d] }, `제출물 "${d.title}" 등록`))
    setSelectedId(d.id)
    setSavingAdd(false); setShowAdd(false)
    setAddForm({ title:"", dueDate:"", ownerMemberId:"", submissionMethod:"", description:"" }); setAddError("")
    showToast("제출물을 추가했습니다.")
  }

  const handleSaveEdit = () => {
    if (!editForm) return
    if (!editForm.title.trim()) { showToast("제출물 이름은 필수입니다.", "error"); return }
    if (!editForm.dueDate) { showToast("제출 기한은 필수입니다.", "error"); return }
    updateProject(p => addActivity({
      ...p, deliverables: p.deliverables.map(d => d.id === editForm.id ? editForm : d),
    }, `제출물 "${editForm.title}" 수정`))
    setEditMode(false); showToast("저장했습니다.")
  }

  const addReq = () => {
    if (!selected || !newReq.trim()) return
    const r: Requirement = { id: uid(), content: newReq.trim(), required: reqRequired }
    updateProject(p => ({
      ...p, deliverables: p.deliverables.map(d =>
        d.id === selected.id ? { ...d, requirements: [...d.requirements, r] } : d
      ),
    }))
    setNewReq(""); showToast("요구사항을 추가했습니다.")
  }

  const saveEditReq = () => {
    if (!selected || !editReq) return
    if (!editReq.content.trim()) return
    updateProject(p => ({
      ...p, deliverables: p.deliverables.map(d =>
        d.id === selected.id
          ? { ...d, requirements: d.requirements.map(r => r.id === editReq.id ? editReq : r) }
          : d
      ),
    }))
    setEditReq(null); showToast("요구사항을 수정했습니다.")
  }

  const deleteReq = (rId: string) => {
    if (!selected) return
    const hasLinked = project.tasks.some(t => t.requirementId === rId)
    if (hasLinked) {
      showToast("이 요구사항에 연결된 업무가 있습니다. 업무 연결을 먼저 해제해 주세요.", "error"); return
    }
    updateProject(p => ({
      ...p, deliverables: p.deliverables.map(d =>
        d.id === selected.id ? { ...d, requirements: d.requirements.filter(r => r.id !== rId) } : d
      ),
    }))
  }

  const handleLinkTask = () => {
    if (!selected || !linkTaskId) return
    updateProject(p => addActivity({
      ...p, tasks: p.tasks.map(t => t.id === linkTaskId
        ? { ...t, deliverableId: selected.id, updatedAt: new Date().toISOString() } : t),
    }, `업무를 "${selected.title}"에 연결`))
    setLinkTaskId(""); showToast("업무를 연결했습니다.")
  }

  const handleUnlinkTask = (taskId: string) => {
    const t = project.tasks.find(x => x.id === taskId)
    updateProject(p => addActivity({
      ...p, tasks: p.tasks.map(x => x.id === taskId
        ? { ...x, deliverableId: "", requirementId: "", updatedAt: new Date().toISOString() } : x),
    }, `업무 "${t?.title ?? ""}" 연결 해제`))
    showToast("업무 연결을 해제했습니다.")
  }

  const handleDelete = () => {
    if (!selected) return
    const hasLinked = project.tasks.some(t => t.deliverableId === selected.id)
    if (hasLinked) { showToast("연결된 업무가 있습니다. 업무 연결을 먼저 해제해 주세요.", "error"); return }
    updateProject(p => addActivity({
      ...p, deliverables: p.deliverables.filter(d => d.id !== selected.id),
    }, `제출물 "${selected.title}" 삭제`))
    setSelectedId(project.deliverables.filter(d => d.id !== selected.id)[0]?.id ?? "")
  }

  return (
    <div className="flex h-full overflow-hidden">
      {toast && <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}
      {createTaskReq && selected && (
        <CreateTaskFromReqModal
          project={project} deliverable={selected} requirement={createTaskReq}
          onClose={() => setCreateTaskReq(null)}
          onCreate={t => {
            updateProject(p => addActivity({ ...p, tasks: [...p.tasks, t] }, `요구사항에서 업무 "${t.title}" 생성`))
            setCreateTaskReq(null)
            showToast(`업무 "${t.title}"를 만들었습니다.`)
          }} />
      )}

      {/* Left panel */}
      <div className="w-60 border-r border-slate-200 bg-white flex flex-col shrink-0">
        <div className="p-3 border-b border-slate-200 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-600">제출물</p>
          <Btn size="sm" onClick={() => setShowAdd(v => !v)}><Plus size={12} />추가</Btn>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {project.deliverables.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6">등록된 제출물 없음</p>
          )}
          {project.deliverables.map(d => {
            const linked = project.tasks.filter(t => t.deliverableId === d.id)
            const done = linked.filter(t => t.status === "DONE").length
            const due = dueBadge(d.dueDate)
            const sel = selectedId === d.id
            return (
              <button key={d.id} onClick={() => { setSelectedId(d.id); setEditMode(false) }}
                className={`w-full text-left rounded-lg p-2.5 transition-colors ${sel ? "bg-blue-50 border border-blue-200" : "hover:bg-slate-50 border border-transparent"}`}>
                <p className={`text-sm font-semibold truncate ${sel ? "text-blue-900" : "text-slate-800"}`}>{d.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{d.dueDate || "기한 미설정"}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {due && <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${due.cls}`}>{due.label}</span>}
                  <span className="text-xs text-slate-400">업무 {linked.length} (완료 {done})</span>
                </div>
              </button>
            )
          })}
        </div>
        {showAdd && (
          <form onSubmit={handleAdd} className="p-3 border-t border-slate-200 space-y-2 bg-slate-50">
            {addError && <p className="text-xs text-red-600">{addError}</p>}
            <input autoFocus value={addForm.title}
              onChange={e => { setAddForm(f => ({ ...f, title: e.target.value })); setAddError("") }}
              placeholder="제출물 이름 *"
              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            <input type="date" value={addForm.dueDate}
              onChange={e => { setAddForm(f => ({ ...f, dueDate: e.target.value })); setAddError("") }}
              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            <select value={addForm.ownerMemberId} onChange={e => setAddForm(f => ({ ...f, ownerMemberId: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">담당자 선택</option>
              {project.members.filter(m => m.role !== "OBSERVER").map(m =>
                <option key={m.id} value={m.id}>{m.name}</option>
              )}
            </select>
            <div className="flex gap-1.5">
              <Btn size="sm" type="submit" disabled={savingAdd} className="flex-1">
                {savingAdd ? "…" : "추가"}
              </Btn>
              <Btn size="sm" variant="ghost" type="button" onClick={() => { setShowAdd(false); setAddError("") }}>취소</Btn>
            </div>
          </form>
        )}
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 overflow-y-auto p-5">
            <EmptyState icon={FileText} title="제출물을 선택하세요"
              desc="과제 안내에 나온 결과물을 제출물로 등록하고 요구사항과 업무를 연결하세요."
              action={<Btn onClick={() => setShowAdd(true)}><Plus size={14} />제출물 등록</Btn>} />
          </div>
        ) : editMode && editForm ? (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 max-w-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 font-display">제출물 수정</h3>
                <div className="flex gap-2">
                  <Btn size="sm" variant="ghost" onClick={() => setEditMode(false)}>취소</Btn>
                  <Btn size="sm" onClick={handleSaveEdit}>저장</Btn>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">제출물 이름 *</label>
                <input value={editForm.title}
                  onChange={e => setEditForm(f => f ? { ...f, title: e.target.value } : f)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">제출 기한 *</label>
                  <input type="date" value={editForm.dueDate}
                    onChange={e => setEditForm(f => f ? { ...f, dueDate: e.target.value } : f)}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">제출 담당자</label>
                  <select value={editForm.ownerMemberId}
                    onChange={e => setEditForm(f => f ? { ...f, ownerMemberId: e.target.value } : f)}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">미지정</option>
                    {project.members.filter(m => m.role !== "OBSERVER").map(m =>
                      <option key={m.id} value={m.id}>{m.name}</option>
                    )}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">제출 경로 <span className="font-normal text-slate-400">(어디에 제출하는지)</span></label>
                <input value={editForm.submissionMethod}
                  onChange={e => setEditForm(f => f ? { ...f, submissionMethod: e.target.value } : f)}
                  placeholder="예: 학교 LMS 과제함, 이메일 제출"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">설명</label>
                <textarea value={editForm.description}
                  onChange={e => setEditForm(f => f ? { ...f, description: e.target.value } : f)} rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                <button onClick={handleDelete}
                  className="text-sm text-red-600 hover:text-red-800 hover:underline flex items-center gap-1">
                  <Trash2 size={13} />제출물 삭제
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 pt-4 pb-0 bg-white border-b border-slate-200 shrink-0">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-slate-900 font-display leading-snug">{selected.title}</h2>
                  <div className="flex items-center gap-3 mt-1.5 text-sm flex-wrap">
                    <span className="flex items-center gap-1 text-slate-600">
                      <Calendar size={13} className="text-slate-400" />
                      <span className={`font-medium ${daysUntil(selected.dueDate) !== null && (daysUntil(selected.dueDate) ?? 0) < 0 ? "text-red-600" : (daysUntil(selected.dueDate) ?? 0) <= 7 ? "text-orange-600" : "text-slate-700"}`}>
                        {selected.dueDate || "기한 미설정"}
                      </span>
                      {selected.dueDate && (() => { const d = dueBadge(selected.dueDate); return d ? <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${d.cls}`}>{d.label}</span> : null })()}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-600">
                      제출 담당자: <span className="font-medium text-slate-800">{selected.ownerMemberId ? getMemberName(project, selected.ownerMemberId) : <span className="text-amber-600">미지정</span>}</span>
                    </span>
                    {selected.submissionMethod && (
                      <>
                        <span className="text-slate-300">|</span>
                        <span className="text-slate-500 text-xs">{selected.submissionMethod}</span>
                      </>
                    )}
                    <span className="text-slate-300">|</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${selected.status === "SUBMITTED" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {selected.status === "SUBMITTED" ? "제출 완료" : "준비 중"}
                    </span>
                  </div>
                </div>
                {!isObserver && (
                  <Btn size="sm" variant="secondary" onClick={() => { setEditMode(true); setEditForm({ ...selected }) }}>
                    <Pencil size={13} />수정
                  </Btn>
                )}
              </div>
              {/* Tabs */}
              <div className="flex gap-0 -mb-px">
                {([["overview","개요·요구사항"],["tasks","연결 업무"],["files","결과 파일"],["review","검토·제출"]] as [DelTab,string][]).map(([key, label]) => (
                  <button key={key} onClick={() => setDelTab(key)}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${delTab === key ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"}`}>
                    {label}
                    {key === "tasks" && <span className="ml-1.5 text-xs text-slate-400">({linkedTasks.length})</span>}
                    {key === "review" && (selected.reviews ?? []).filter(r => r.status === "pending").length > 0 && (
                      <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1 rounded">검토 필요</span>
                    )}
                    {key === "review" && (selected.submissionRecords ?? []).length > 0 && (
                      <span className="ml-1.5 text-xs bg-emerald-100 text-emerald-700 px-1 rounded">{(selected.submissionRecords ?? []).length}건 제출</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-5">

              {/* ── Tab: 개요·요구사항 ── */}
              {delTab === "overview" && (
                <div className="max-w-2xl space-y-5">
                  {selected.description && (
                    <p className="text-sm text-slate-600 leading-relaxed">{selected.description}</p>
                  )}
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-slate-900 font-display">요구사항 ({selected.requirements.length})</h3>
                      <span className="text-xs text-slate-400">필수·선택 구분</span>
                    </div>
                    {selected.requirements.length > 0 && (
                      <div className="divide-y divide-slate-100 mb-4">
                        {selected.requirements.map(r => {
                          const linkedCount = project.tasks.filter(t => t.requirementId === r.id).length
                          if (editReq?.id === r.id) {
                            return (
                              <div key={r.id} className="py-3 space-y-2">
                                <input value={editReq.content}
                                  onChange={e => setEditReq(er => er ? { ...er, content: e.target.value } : er)}
                                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                <div className="flex items-center gap-3">
                                  <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
                                    <input type="checkbox" checked={editReq.required}
                                      onChange={e => setEditReq(er => er ? { ...er, required: e.target.checked } : er)} className="rounded" />
                                    필수 조건
                                  </label>
                                  <Btn size="sm" onClick={saveEditReq} disabled={!editReq.content.trim()}>저장</Btn>
                                  <Btn size="sm" variant="ghost" onClick={() => setEditReq(null)}>취소</Btn>
                                </div>
                              </div>
                            )
                          }
                          return (
                            <div key={r.id} className="py-3 flex items-start gap-2">
                              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded mt-0.5 shrink-0 ${r.required ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                                {r.required ? "필수" : "선택"}
                              </span>
                              <p className="text-sm text-slate-800 flex-1 leading-relaxed">{r.content}</p>
                              <div className="flex items-center gap-1 shrink-0">
                                {linkedCount > 0 && <span className="text-xs text-slate-400">업무 {linkedCount}개</span>}
                                {!isObserver && (
                                  <>
                                    <Btn size="sm" variant="secondary" onClick={() => setCreateTaskReq(r)}>
                                      <Plus size={12} />업무 만들기
                                    </Btn>
                                    <button onClick={() => setEditReq({ ...r })} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700" title="수정">
                                      <Pencil size={12} />
                                    </button>
                                    <button onClick={() => deleteReq(r.id)} className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500" title="삭제">
                                      <Trash2 size={12} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {!isObserver && (
                      <div className={`space-y-2 ${selected.requirements.length > 0 ? "border-t border-slate-100 pt-4" : ""}`}>
                        <input value={newReq} onChange={e => setNewReq(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && addReq()}
                          placeholder="요구사항 입력 후 Enter 또는 추가 버튼"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
                            <input type="checkbox" checked={reqRequired}
                              onChange={e => setReqRequired(e.target.checked)} className="rounded" />
                            필수 조건
                          </label>
                          <Btn size="sm" onClick={addReq} disabled={!newReq.trim()}>추가</Btn>
                        </div>
                      </div>
                    )}
                    {selected.requirements.length === 0 && isObserver && (
                      <p className="text-sm text-slate-400 text-center py-4">등록된 요구사항이 없습니다.</p>
                    )}
                  </div>
                </div>
              )}

              {/* ── Tab: 연결 업무 ── */}
              {delTab === "tasks" && (
                <div className="max-w-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-slate-900">연결 업무 {linkedTasks.length}개</span>
                      <span className="text-sm text-slate-400 ml-2">완료 {linkedTasks.filter(t => t.status === "DONE").length}개 (업무 완료율은 제출 완료와 별개입니다)</span>
                    </div>
                    {!isObserver && (
                      <div className="flex gap-2">
                        <Btn size="sm" variant="secondary" onClick={() => setCreateTaskReq({ id:"_new", content:`${selected.title} 업무`, required:false })}>
                          <Plus size={13} />새 업무 만들기
                        </Btn>
                      </div>
                    )}
                  </div>
                  {linkedTasks.length > 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                      {linkedTasks.map(t => {
                        const m = getMember(project, t.assigneeMemberId)
                        const req = selected.requirements.find(r => r.id === t.requirementId)
                        const due = t.status !== "DONE" ? dueBadge(t.dueDate) : null
                        return (
                          <div key={t.id} className="py-3 px-4 flex items-center gap-3">
                            <StatusBadge status={t.status} />
                            <div className="flex-1 min-w-0">
                              <button onClick={() => openTask(t.id)}
                                className="text-sm font-medium text-slate-800 hover:text-blue-600 hover:underline truncate block text-left">
                                {t.title}
                              </button>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {m?.name ?? "담당자 미지정"}
                                {t.dueDate ? ` · ${t.dueDate}` : ""}
                                {req ? ` · ${req.content.slice(0, 28)}${req.content.length > 28 ? "…" : ""}` : ""}
                              </p>
                            </div>
                            {due && <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${due.cls}`}>{due.label}</span>}
                            {!isObserver && (
                              <button onClick={() => handleUnlinkTask(t.id)}
                                className="p-1 rounded hover:bg-slate-100 text-slate-300 hover:text-red-500 shrink-0" title="연결 해제">
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-slate-400 text-sm">
                      <ClipboardList size={24} className="mx-auto mb-2 text-slate-300" />
                      연결된 업무가 없습니다. 요구사항 탭에서 업무를 만들거나 아래에서 기존 업무를 연결하세요.
                    </div>
                  )}
                  {!isObserver && (
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
                      <p className="text-xs font-semibold text-slate-600">기존 업무 연결</p>
                      <div className="flex gap-2">
                        <select value={linkTaskId} onChange={e => setLinkTaskId(e.target.value)}
                          className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                          <option value="">연결할 업무 선택</option>
                          {unlinkedTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                        </select>
                        <Btn size="sm" onClick={handleLinkTask} disabled={!linkTaskId}>연결</Btn>
                      </div>
                      {unlinkedTasks.length === 0 && (
                        <p className="text-xs text-slate-400">미연결 업무가 없습니다. 위에서 새 업무를 만드세요.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: 결과 파일 ── */}
              {delTab === "files" && (
                <div className="max-w-2xl space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
                    <Info size={14} className="mt-0.5 shrink-0" />
                    <div>
                      자료 탭에서 업로드한 파일을 이 제출물과 연결할 수 있습니다. 검토·제출 탭에서 최종 버전을 확정하세요.
                      <br /><span className="text-xs text-amber-600">새 버전을 올려도 이전 검토 완료나 확정 버전이 자동으로 교체되지 않습니다.</span>
                    </div>
                  </div>
                  {project.files.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-sm">
                      <FolderOpen size={24} className="mx-auto mb-2 text-slate-300" />
                      자료 탭에서 먼저 파일을 업로드한 뒤 이 제출물과 연결하세요.
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                      {project.files.map(fg => {
                        const latest = fg.versions[0]
                        const uploader = getMember(project, latest.uploadedByMemberId)
                        return (
                          <div key={fg.id} className="px-4 py-3 flex items-center gap-3">
                            <FolderOpen size={15} className="text-blue-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{fg.name}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                v{latest.version} · {uploader?.name ?? ""} · {fmtDate(latest.uploadedAt)} · {latest.size}
                              </p>
                            </div>
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{fg.category}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: 검토·제출 ── */}
              {delTab === "review" && (
                <div className="max-w-2xl space-y-5">
                  {/* Prototype notice */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 flex items-start gap-2">
                    <Info size={14} className="mt-0.5 shrink-0" />
                    <div>
                      검토와 제출은 팀원 사이의 기록입니다. 학교 시스템과 자동 연동되지 않으며, 제출 담당자가 외부에서 직접 제출한 사실을 이 곳에 기록하세요.
                    </div>
                  </div>

                  {/* Reviews section */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-slate-900 font-display">검토 ({selected.reviews.length})</h3>
                      {!isObserver && (
                        <Btn size="sm" variant="secondary" onClick={() => setShowReviewForm(v => !v)}>
                          <Plus size={13} />검토 요청
                        </Btn>
                      )}
                    </div>
                    {showReviewForm && !isObserver && (
                      <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                        <p className="text-xs font-semibold text-slate-600">새 검토 요청</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">대상 파일</label>
                            <select value={reviewForm.fileGroupId} onChange={e => setReviewForm(f => ({ ...f, fileGroupId: e.target.value, fileVersion: project.files.find(fg => fg.id === e.target.value)?.versions[0]?.version ?? 0 }))}
                              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                              <option value="">파일 선택</option>
                              {project.files.map(fg => <option key={fg.id} value={fg.id}>{fg.name} (최신 v{fg.versions[0]?.version ?? 1})</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">검토자</label>
                            <select value={reviewForm.reviewerMemberId} onChange={e => setReviewForm(f => ({ ...f, reviewerMemberId: e.target.value }))}
                              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                              <option value="">검토자 선택</option>
                              {project.members.filter(m => m.role !== "OBSERVER").map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">검토 요청 내용 <span className="font-normal text-slate-400">(선택)</span></label>
                          <textarea value={reviewForm.comment} onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))} rows={2}
                            placeholder="검토할 포인트나 요청 내용"
                            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="flex gap-2">
                          <Btn size="sm" onClick={() => {
                            if (!reviewForm.fileGroupId || !reviewForm.reviewerMemberId) { showToast("파일과 검토자를 선택해 주세요.", "error"); return }
                            const review: FileReview = {
                              id: uid(), fileGroupId: reviewForm.fileGroupId, fileVersion: reviewForm.fileVersion,
                              requestedByMemberId: me?.id ?? "", reviewerMemberId: reviewForm.reviewerMemberId,
                              status: "pending", comment: reviewForm.comment, createdAt: new Date().toISOString(), reviewedAt: "",
                            }
                            updateProject(p => addActivity({
                              ...p, deliverables: p.deliverables.map(d => d.id === selected.id ? { ...d, reviews: [...d.reviews, review] } : d),
                            }, `"${selected.title}"에 검토 요청`))
                            setReviewForm({ fileGroupId:"", fileVersion:0, reviewerMemberId:"", comment:"" })
                            setShowReviewForm(false); showToast("검토를 요청했습니다.")
                          }}>검토 요청 등록</Btn>
                          <Btn size="sm" variant="ghost" onClick={() => setShowReviewForm(false)}>취소</Btn>
                        </div>
                      </div>
                    )}
                    {selected.reviews.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-6">검토 기록이 없습니다.</p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {selected.reviews.map(rev => {
                          const fg = project.files.find(f => f.id === rev.fileGroupId)
                          const requester = getMember(project, rev.requestedByMemberId)
                          const reviewer = getMember(project, rev.reviewerMemberId)
                          const statusCls = rev.status === "approved" ? "bg-emerald-100 text-emerald-700" : rev.status === "change_requested" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                          const statusLabel = rev.status === "approved" ? "검토 완료" : rev.status === "change_requested" ? "수정 요청" : "검토 중"
                          return (
                            <div key={rev.id} className="py-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusCls}`}>{statusLabel}</span>
                                    <span className="text-xs text-slate-500">{fg?.name ?? "파일 없음"} v{rev.fileVersion}</span>
                                    <span className="text-xs text-slate-400">검토자: {reviewer?.name ?? "미지정"}</span>
                                  </div>
                                  {rev.comment && <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">{rev.comment}</p>}
                                  <p className="text-xs text-slate-400 mt-1">{requester?.name ?? ""} 요청 · {fmtDate(rev.createdAt)}{rev.reviewedAt ? ` · 검토 ${fmtDate(rev.reviewedAt)}` : ""}</p>
                                </div>
                                {rev.status === "pending" && !isObserver && (
                                  <div className="flex gap-1.5 shrink-0">
                                    <Btn size="sm" variant="secondary" onClick={() => {
                                      updateProject(p => addActivity({ ...p, deliverables: p.deliverables.map(d => d.id === selected.id ? { ...d, reviews: d.reviews.map(r => r.id === rev.id ? { ...r, status:"approved", reviewedAt:new Date().toISOString() } : r) } : d) }, `"${selected.title}" 검토 완료`))
                                      showToast("검토 완료로 표시했습니다.")
                                    }}>
                                      <Check size={12} />완료
                                    </Btn>
                                    <Btn size="sm" variant="danger" onClick={() => {
                                      updateProject(p => addActivity({ ...p, deliverables: p.deliverables.map(d => d.id === selected.id ? { ...d, reviews: d.reviews.map(r => r.id === rev.id ? { ...r, status:"change_requested", reviewedAt:new Date().toISOString() } : r) } : d) }, `"${selected.title}" 수정 요청`))
                                      showToast("수정 요청으로 표시했습니다.")
                                    }}>
                                      수정 요청
                                    </Btn>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Submission records */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 font-display">제출 기록 ({selected.submissionRecords.length})</h3>
                        <p className="text-xs text-slate-400 mt-0.5">팀원이 외부에서 직접 제출한 사실을 기록합니다</p>
                      </div>
                      {!isObserver && (
                        <Btn size="sm" onClick={() => setShowSubForm(v => !v)}>
                          <Plus size={13} />제출 기록 추가
                        </Btn>
                      )}
                    </div>
                    {showSubForm && !isObserver && (
                      <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                        <p className="text-xs font-semibold text-slate-600">제출 기록 등록</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">제출 파일 <span className="font-normal text-slate-400">(선택)</span></label>
                            <select value={subForm.fileGroupId} onChange={e => setSubForm(f => ({ ...f, fileGroupId: e.target.value, fileVersion: project.files.find(fg => fg.id === e.target.value)?.versions[0]?.version ?? 0 }))}
                              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                              <option value="">파일 선택</option>
                              {project.files.map(fg => <option key={fg.id} value={fg.id}>{fg.name} (v{fg.versions[0]?.version})</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">제출자</label>
                            <select value={subForm.confirmedBy} onChange={e => setSubForm(f => ({ ...f, confirmedBy: e.target.value }))}
                              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                              <option value="">선택</option>
                              {project.members.filter(m => m.role !== "OBSERVER").map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">제출 경로 <span className="font-normal text-slate-400">(어디에 제출했는지)</span></label>
                          <input value={subForm.submissionPath} onChange={e => setSubForm(f => ({ ...f, submissionPath: e.target.value }))}
                            placeholder="예: 학교 LMS 과제함 업로드"
                            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">메모 <span className="font-normal text-slate-400">(선택)</span></label>
                          <input value={subForm.note} onChange={e => setSubForm(f => ({ ...f, note: e.target.value }))}
                            placeholder="제출 확인 번호, 스크린샷 위치 등"
                            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="flex gap-2">
                          <Btn size="sm" onClick={() => {
                            if (!subForm.confirmedBy) { showToast("제출자를 선택해 주세요.", "error"); return }
                            const rec: SubmissionRecord = {
                              id: uid(), submittedByMemberId: subForm.confirmedBy,
                              submittedAt: new Date().toISOString(),
                              fileGroupId: subForm.fileGroupId, fileVersion: subForm.fileVersion,
                              submissionPath: subForm.submissionPath, note: subForm.note,
                            }
                            updateProject(p => addActivity({
                              ...p, deliverables: p.deliverables.map(d => d.id === selected.id ? { ...d, submissionRecords: [...d.submissionRecords, rec], status: "SUBMITTED" } : d),
                            }, `"${selected.title}" 제출 기록`))
                            setSubForm({ fileGroupId:"", fileVersion:0, submissionPath:"", note:"", confirmedBy:"" })
                            setShowSubForm(false); showToast("제출 기록을 추가했습니다.")
                          }}>기록 등록</Btn>
                          <Btn size="sm" variant="ghost" onClick={() => setShowSubForm(false)}>취소</Btn>
                        </div>
                      </div>
                    )}
                    {selected.submissionRecords.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-sm">
                        <p>아직 제출 기록이 없습니다.</p>
                        <p className="text-xs mt-1">팀원이 외부(학교 LMS 등)에서 직접 제출한 후 '제출 기록 추가'로 기록하세요.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {selected.submissionRecords.map(rec => {
                          const fg = project.files.find(f => f.id === rec.fileGroupId)
                          const submitter = getMember(project, rec.submittedByMemberId)
                          return (
                            <div key={rec.id} className="py-3">
                              <div className="flex items-start gap-2">
                                <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-slate-800">
                                    {submitter?.name ?? "알 수 없음"} 제출
                                    {fg ? ` · ${fg.name} v${rec.fileVersion}` : ""}
                                  </p>
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    {fmtDateTime(rec.submittedAt)}{rec.submissionPath ? ` · ${rec.submissionPath}` : ""}
                                  </p>
                                  {rec.note && <p className="text-xs text-slate-500 mt-1">{rec.note}</p>}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TEAM VIEW
// ═══════════════════════════════════════════════════════════════
function TeamView({ project, updateProject, openTask, initialTab }: {
  project: Project; updateProject: (upd: (p: Project) => Project) => void; openTask: (id: string) => void
  initialTab?: "members"|"alerts"|"activity"|"settings"
}) {
  const [tab, setTab] = useState<"members"|"alerts"|"activity"|"settings">(initialTab ?? "members")
  const [showAddMember, setShowAddMember] = useState(false)
  const [addName, setAddName] = useState("")
  const [addRole, setAddRole] = useState<MemberRole>("MEMBER")
  const [settingsForm, setSettingsForm] = useState({
    name: project.name, subject: project.subject,
    semester: project.semester, description: project.description, deadline: project.deadline,
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [settingsError, setSettingsError] = useState("")

  const alerts = computeAlerts(project)
  const unread = alerts.filter(a => !a.isRead)

  const alertMeta: Record<string, { icon: any; bg: string; text: string; border: string }> = {
    inactive:   { icon: Clock,         bg:"bg-orange-50", text:"text-orange-700", border:"border-orange-200" },
    unassigned: { icon: UserCheck,     bg:"bg-amber-50",  text:"text-amber-700",  border:"border-amber-200" },
    unlinked:   { icon: Link2,         bg:"bg-blue-50",   text:"text-blue-700",   border:"border-blue-200" },
    overdue:    { icon: AlertTriangle, bg:"bg-red-50",    text:"text-red-700",    border:"border-red-200" },
  }
  const actionLabel: Record<string, string> = {
    inactive:"확인하기", unassigned:"담당자 지정", unlinked:"업무 연결", overdue:"업무 보기",
  }

  const handleAddMember = () => {
    if (!addName.trim()) return
    const m: Member = {
      id: uid(), name: addName.trim(), role: addRole,
      color: MEMBER_COLORS[project.members.length % MEMBER_COLORS.length],
      email: "", lastActiveAt: new Date().toISOString(),
    }
    updateProject(p => addActivity({ ...p, members: [...p.members, m] }, `팀원 ${m.name} 추가`))
    setAddName(""); setShowAddMember(false)
  }

  const handleRemoveMember = (memberId: string) => {
    const m = getMember(project, memberId)
    if (!m) return
    const hasTasks = project.tasks.some(t => t.assigneeMemberId === memberId)
    if (hasTasks) {
      alert(`${m.name}님에게 배정된 업무가 있습니다. 업무 담당자를 먼저 변경해 주세요.`)
      return
    }
    if (!confirm(`${m.name}님을 팀에서 제거하시겠습니까?`)) return
    updateProject(p => addActivity({ ...p, members: p.members.filter(x => x.id !== memberId) }, `팀원 ${m.name} 제거`))
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settingsForm.name.trim()) return
    setSavingSettings(true); setSettingsError("")
    await new Promise(r => setTimeout(r, 300))
    try {
      updateProject(p => addActivity({ ...p, ...settingsForm }, "프로젝트 정보 수정"))
      setSavingSettings(false); setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 3000)
    } catch {
      setSavingSettings(false)
      setSettingsError("저장에 실패했습니다. 브라우저 저장 공간을 확인해 주세요.")
    }
  }

  const markAlertRead = (id: string) =>
    updateProject(p => ({ ...p, readAlertIds: [...new Set([...p.readAlertIds, id])] }))

  return (
    <div className="p-5 max-w-2xl space-y-4">
      <div className="flex gap-1.5 flex-wrap">
        {([
          ["members","팀원",""],
          ["alerts","활동 현황",unread.length > 0 ? String(unread.length) : ""],
          ["activity","활동 기록",""],
          ["settings","설정",""],
        ] as const).map(([t, label, badge]) => (
          <button key={t} onClick={() => setTab(t as any)}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            {label}
            {badge && (
              <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "members" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {project.members.map(m => {
              const myTasks = project.tasks.filter(t => t.assigneeMemberId === m.id)
              const done = myTasks.filter(t => t.status === "DONE").length
              const attendedMeetings = project.meetings.filter(mt => mt.attendeeMemberIds.includes(m.id))
              const attended = attendedMeetings.filter(mt => mt.checkedInMemberIds.includes(m.id)).length
              const daysSince = Math.floor((Date.now() - new Date(m.lastActiveAt).getTime()) / 86400000)
              const isMe = m.id === MY_USER_ID
              return (
                <div key={m.id} className="px-4 py-4 flex items-start gap-3">
                  <Avatar member={m} size={9} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900">{m.name}</p>
                      {isMe && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">나</span>}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.role === "LEADER" ? "bg-blue-100 text-blue-700" : m.role === "OBSERVER" ? "bg-slate-100 text-slate-600" : "bg-teal-50 text-teal-700"}`}>
                        {m.role === "LEADER" ? "팀장" : m.role === "OBSERVER" ? "열람" : "팀원"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        ["담당 업무", `${myTasks.length}개 (완료 ${done})`],
                        ["출석", `${attended}/${attendedMeetings.length}회`],
                        ["마지막 활동", daysSince === 0 ? "오늘" : `${daysSince}일 전`],
                      ].map(([k, v]) => (
                        <div key={k} className="bg-slate-50 rounded-lg p-2 text-center">
                          <p className="text-xs text-slate-400">{k}</p>
                          <p className="text-xs font-semibold text-slate-700 mt-0.5">{v}</p>
                        </div>
                      ))}
                    </div>
                    {daysSince >= 14 && (
                      <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                        <AlertTriangle size={10} />최근 2주 활동 기록 없음
                      </p>
                    )}
                  </div>
                  {!isMe && m.role !== "LEADER" && (
                    <button onClick={() => handleRemoveMember(m.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500" title="팀에서 제거">
                      <X size={13} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          {showAddMember ? (
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-800">팀원 추가</p>
              <p className="text-xs text-slate-400">이 시제품에서는 실제 초대장이 발송되지 않습니다.</p>
              <div className="flex gap-2">
                <input value={addName} onChange={e => setAddName(e.target.value)} autoFocus
                  onKeyDown={e => e.key === "Enter" && handleAddMember()} placeholder="이름"
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={addRole} onChange={e => setAddRole(e.target.value as MemberRole)}
                  className="border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="MEMBER">팀원</option>
                  <option value="OBSERVER">열람</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <Btn size="sm" variant="secondary" onClick={() => { setShowAddMember(false); setAddName("") }}>취소</Btn>
                <Btn size="sm" onClick={handleAddMember} disabled={!addName.trim()}>추가</Btn>
              </div>
            </div>
          ) : (
            <Btn variant="secondary" onClick={() => setShowAddMember(true)} className="w-full justify-center">
              <UserPlus size={14} />팀원 추가
            </Btn>
          )}
        </div>
      )}

      {tab === "alerts" && (
        <div className="space-y-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-500 flex items-start gap-2">
            <Info size={12} className="text-slate-400 mt-0.5 shrink-0" />
            알림은 현재 프로젝트 상태에서 자동으로 계산됩니다.
            담당자를 지정하거나 업무를 완료하면 해당 알림이 사라집니다.
          </div>
          {alerts.length === 0 ? (
            <div className="text-center py-10 text-sm text-slate-400">확인이 필요한 항목이 없습니다.</div>
          ) : alerts.map(a => {
            const meta = alertMeta[a.type]
            const Icon = meta.icon
            return (
              <div key={a.id} className={`rounded-xl border p-4 transition-opacity ${a.isRead ? "opacity-60 border-slate-200 bg-white" : `${meta.bg} border-l-4 ${meta.border} bg-white`}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.bg} border ${meta.border}`}>
                    <Icon size={14} className={meta.text} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                      {!a.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 mb-2 leading-relaxed">{a.detail}</p>
                    <div className="flex items-center gap-3">
                      {a.relatedTaskId && (
                        <button onClick={() => { markAlertRead(a.id); openTask(a.relatedTaskId) }}
                          className="text-xs font-semibold text-blue-600 hover:underline">
                          {actionLabel[a.type]} →
                        </button>
                      )}
                      {!a.isRead && (
                        <button onClick={() => markAlertRead(a.id)} className="text-xs text-slate-400 hover:text-slate-600">
                          읽음 처리
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === "activity" && (
        <div className="bg-white rounded-xl border border-slate-200">
          {project.activityLog.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">아직 기록된 활동이 없습니다.</div>
          ) : project.activityLog.map(a => {
            const m = getMember(project, a.memberId)
            return (
              <div key={a.id} className="px-4 py-3 flex items-start gap-3 border-b border-slate-100 last:border-0">
                <Avatar member={m} size={6} />
                <div className="flex-1">
                  <p className="text-sm text-slate-800">{a.description}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{m?.name ?? "나"} · {fmtDateTime(a.createdAt)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === "settings" && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 font-display">프로젝트 정보</h3>
            {settingsSaved && <span className="text-xs text-emerald-600 flex items-center gap-1"><Check size={11} />저장됨</span>}
          </div>
          {settingsError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertCircle size={13} className="shrink-0" />{settingsError}
            </div>
          )}
          {project.isDemo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 text-xs text-blue-700 flex items-start gap-2">
              <Info size={12} className="mt-0.5 shrink-0" />예시 프로젝트입니다. 수정해도 시제품 내에서만 반영됩니다.
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">프로젝트 이름 *</label>
            <input value={settingsForm.name}
              onChange={e => setSettingsForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">과목명</label>
              <input value={settingsForm.subject}
                onChange={e => setSettingsForm(f => ({ ...f, subject: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">학기</label>
              <input value={settingsForm.semester}
                onChange={e => setSettingsForm(f => ({ ...f, semester: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">프로젝트 기한</label>
            <input type="date" value={settingsForm.deadline}
              onChange={e => setSettingsForm(f => ({ ...f, deadline: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">설명</label>
            <textarea value={settingsForm.description}
              onChange={e => setSettingsForm(f => ({ ...f, description: e.target.value }))} rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end">
            <Btn type="submit" disabled={savingSettings || !settingsForm.name.trim()}>
              {savingSettings ? <><Loader2 size={13} className="animate-spin" />저장 중…</> : "저장"}
            </Btn>
          </div>
        </form>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// PROJECT WORKSPACE
// ═══════════════════════════════════════════════════════════════
function ProjectWorkspace({ project, projects, onBack, onSwitch, updateProject }: {
  project: Project; projects: Project[]; onBack: () => void; onSwitch: (id: string) => void
  updateProject: (upd: (p: Project) => Project) => void
}) {
  const [view, setView] = useState<ProjectView>(() => {
    const hash = window.location.hash.slice(1)
    const [, v] = hash.split("/")
    return (["overview","tasks","meetings","files","deliverables","team","settings"].includes(v) ? v : "overview") as ProjectView
  })
  const [selectedTaskId, setSelectedTaskId] = useState("")
  const [selectedDeliverableId, setSelectedDeliverableId] = useState(project.deliverables[0]?.id ?? "")
  const [selectedMeetingId, setSelectedMeetingId] = useState("")
  const [showNotifications, setShowNotifications] = useState(false)
  const [teamInitialTab, setTeamInitialTab] = useState<"members"|"alerts"|"activity"|"settings"|"">()

  // Dirty state management
  const isDirtyRef = useRef(false)
  const pendingSaveRef = useRef<(() => Promise<boolean>)|null>(null)
  const pendingDiscardRef = useRef<(() => void)|null>(null)
  const [showUnsaved, setShowUnsaved] = useState(false)
  const [pendingNav, setPendingNav] = useState<(() => void)|null>(null)
  const [unsavedSaving, setUnsavedSaving] = useState(false)

  const registerDirty = useCallback((dirty: boolean, save: () => Promise<boolean>, discard: () => void) => {
    isDirtyRef.current = dirty
    if (dirty) { pendingSaveRef.current = save; pendingDiscardRef.current = discard }
  }, [])

  // Warn on browser tab close when there are unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) { e.preventDefault(); e.returnValue = "" }
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [])

  const guardedNav = useCallback((action: () => void) => {
    if (isDirtyRef.current) {
      setPendingNav(() => action)
      setShowUnsaved(true)
    } else {
      action()
    }
  }, [])

  const handleUnsavedSave = async () => {
    setUnsavedSaving(true)
    const ok = await pendingSaveRef.current?.()
    setUnsavedSaving(false)
    if (ok !== false) {
      isDirtyRef.current = false
      setShowUnsaved(false)
      pendingNav?.(); setPendingNav(null)
    }
  }

  const handleUnsavedDiscard = () => {
    pendingDiscardRef.current?.()
    isDirtyRef.current = false
    setShowUnsaved(false)
    pendingNav?.(); setPendingNav(null)
  }

  // Sync hash
  useEffect(() => {
    window.location.hash = `${project.id}/${view}`
  }, [project.id, view])

  // Listen to hash changes (browser back/forward)
  useEffect(() => {
    const handler = () => {
      const hash = window.location.hash.slice(1)
      const [pid, v] = hash.split("/")
      if (pid !== project.id) return
      if (["overview","tasks","meetings","files","deliverables","team"].includes(v)) {
        setView(v as ProjectView)
      }
    }
    window.addEventListener("hashchange", handler)
    return () => window.removeEventListener("hashchange", handler)
  }, [project.id])

  const changeView = useCallback((v: ProjectView) => {
    guardedNav(() => {
      setView(v)
      if (v !== "tasks") { setSelectedTaskId(""); isDirtyRef.current = false }
      if (v !== "meetings") setSelectedMeetingId("")
    })
  }, [guardedNav])

  const openTask = useCallback((id: string) => {
    guardedNav(() => { setSelectedTaskId(id); setView("tasks") })
  }, [guardedNav])

  const openDeliverable = useCallback((id: string) => {
    guardedNav(() => { setSelectedDeliverableId(id); setView("deliverables") })
  }, [guardedNav])

  const openMeeting = useCallback((id: string) => {
    guardedNav(() => { setSelectedMeetingId(id); setView("meetings") })
  }, [guardedNav])

  const handleBack = useCallback(() => guardedNav(onBack), [guardedNav, onBack])
  const handleSwitch = useCallback((id: string) => guardedNav(() => {
    isDirtyRef.current = false; onSwitch(id)
  }), [guardedNav, onSwitch])

  // Guarded task selection (handles dirty state when switching tasks)
  const handleSetSelectedTaskId = useCallback((id: string) => {
    guardedNav(() => { setSelectedTaskId(id) })
  }, [guardedNav])

  const me = getMyMember(project)
  const myName = me?.name ?? "나"
  const alertCount = useMemo(() => computeAlerts(project).filter(a => !a.isRead).length, [project])

  const viewTitles: Record<ProjectView, string> = {
    overview:"프로젝트 홈", tasks:"업무", meetings:"일정·회의", files:"자료", deliverables:"제출물", team:"팀원", settings:"설정",
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {showUnsaved && (
        <UnsavedChangesDialog saving={unsavedSaving}
          onSave={handleUnsavedSave}
          onDiscard={handleUnsavedDiscard}
          onCancel={() => { setShowUnsaved(false); setPendingNav(null) }} />
      )}
      <ProjectSidebar project={project} view={view} setView={changeView}
        alertCount={alertCount} onBack={handleBack} onSwitch={handleSwitch} projects={projects} />
      <div className="ml-56 flex-1 flex flex-col overflow-hidden">
        <TopBar title={`${project.name} · ${viewTitles[view]}`}
          alertCount={alertCount} onBell={() => setShowNotifications(v => !v)} myName={myName} />
        <main className="flex-1 overflow-hidden bg-white">
          {view === "overview" && (
            <div className="h-full overflow-y-auto">
              <OverviewView project={project} setView={changeView}
                openTask={openTask} openDeliverable={openDeliverable} openMeeting={openMeeting}
                openAlerts={() => { setTeamInitialTab("alerts"); changeView("team") }} />
            </div>
          )}
          {view === "tasks" && (
            <TasksView project={project}
              selectedTaskId={selectedTaskId}
              setSelectedTaskId={handleSetSelectedTaskId}
              updateProject={updateProject}
              onOpenMeeting={openMeeting}
              onOpenDeliverable={openDeliverable}
              registerDirty={registerDirty} />
          )}
          {view === "meetings" && (
            <div className="h-full overflow-y-auto">
              <MeetingsView project={project}
                selectedMeetingId={selectedMeetingId}
                setSelectedMeetingId={setSelectedMeetingId}
                updateProject={updateProject}
                openTask={openTask}
                openDeliverable={openDeliverable}
                onAddTask={t => updateProject(p => ({ ...p, tasks: [...p.tasks, t] }))} />
            </div>
          )}
          {view === "files" && (
            <div className="h-full overflow-y-auto">
              <FilesView project={project} updateProject={updateProject} />
            </div>
          )}
          {view === "deliverables" && (
            <DeliverablesView project={project}
              selectedId={selectedDeliverableId}
              setSelectedId={setSelectedDeliverableId}
              updateProject={updateProject}
              openTask={openTask} />
          )}
          {(view === "team" || view === "settings") && (
            <div className="h-full overflow-y-auto">
              <TeamView project={project} updateProject={updateProject} openTask={openTask} initialTab={view === "settings" ? "settings" : (teamInitialTab || undefined)} />
            </div>
          )}
        </main>
      </div>
      {showNotifications && (
        <NotificationPanel project={project}
          onClose={() => setShowNotifications(false)}
          onMarkRead={id => updateProject(p => ({ ...p, readAlertIds: [...new Set([...p.readAlertIds, id])] }))}
          onNavigate={taskId => { openTask(taskId); setShowNotifications(false) }} />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [projects, setProjects] = useState<Project[]>(loadProjects)
  const [currentProjectId, setCurrentProjectId] = useState<string|null>(() => {
    const hash = window.location.hash.slice(1)
    const [pid] = hash.split("/")
    return pid || null
  })
  const [showCreate, setShowCreate] = useState(false)
  const [saveError, setSaveError] = useState("")

  // Persist on every project change
  useEffect(() => {
    const ok = saveProjects(projects)
    setSaveError(ok ? "" : "변경 내용을 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.")
  }, [projects])

  // Hash-based navigation: handle browser back/forward
  useEffect(() => {
    const handler = () => {
      const hash = window.location.hash.slice(1)
      const [pid] = hash.split("/")
      if (!pid) { setCurrentProjectId(null); return }
      if (projects.find(p => p.id === pid)) setCurrentProjectId(pid)
    }
    window.addEventListener("hashchange", handler)
    return () => window.removeEventListener("hashchange", handler)
  }, [projects])

  const updateProject = useCallback((id: string, upd: (p: Project) => Project) => {
    setProjects(prev => prev.map(p => p.id === id ? upd(p) : p))
  }, [])

  const openProject = (id: string) => { setCurrentProjectId(id) }

  const handleCreate = (p: Project) => {
    setProjects(prev => [...prev, p])
    setCurrentProjectId(p.id)
    setShowCreate(false)
  }

  const handleBack = () => {
    setCurrentProjectId(null)
    window.location.hash = ""
  }

  const handleSwitch = (id: string) => {
    setCurrentProjectId(id)
  }

  const currentProject = currentProjectId
    ? projects.find(p => p.id === currentProjectId) ?? null
    : null

  // If hash points to a valid project, ensure it's loaded
  useEffect(() => {
    if (!currentProjectId) return
    if (!projects.find(p => p.id === currentProjectId)) {
      setCurrentProjectId(null)
    }
  }, [currentProjectId, projects])

  if (currentProject) {
    return (
      <>
        {saveError && (
          <div className="fixed top-0 left-0 right-0 z-[200] bg-red-700 text-white text-sm px-4 py-2.5 flex items-center gap-2 justify-center">
            <AlertCircle size={14} className="shrink-0" />
            <span>{saveError}</span>
            <button onClick={() => setSaveError("")} className="ml-4 underline text-red-200">닫기</button>
          </div>
        )}
        <ProjectWorkspace
          key={currentProjectId}
          project={currentProject}
          projects={projects}
          onBack={handleBack}
          onSwitch={handleSwitch}
          updateProject={(upd) => updateProject(currentProjectId!, upd)}
        />
      </>
    )
  }

  return (
    <>
      {saveError && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-red-700 text-white text-sm px-4 py-2.5 flex items-center gap-2 justify-center">
          <AlertCircle size={14} className="shrink-0" />{saveError}
          <button onClick={() => setSaveError("")} className="ml-4 underline text-red-200">닫기</button>
        </div>
      )}
      <ProjectList projects={projects} onOpen={openProject} onCreateClick={() => setShowCreate(true)} />
      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </>
  )
}
