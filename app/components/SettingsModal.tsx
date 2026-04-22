"use client";

import { useState, useEffect } from "react";
import { Store } from "../lib/mockData";
import { showToast } from "./Toast";
import { useStoreProvider } from "../context/StoreContext";
import { supabase } from "@/utils/supabase/client";

interface SettingsModalProps {
  store: Store;
  onClose: () => void;
}

interface TeamMember {
  id: string;
  email: string;
  owner_name: string | null;
  role: string;
}

export default function SettingsModal({ store, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"general" | "webhook" | "link" | "team">("general");
  const { profile, storeInfo, isMaster, updateStoreProfile } = useStoreProvider();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(storeInfo?.name || profile?.store_name || store.name);
  const [editCategory, setEditCategory] = useState(storeInfo?.category || profile?.category || store.type);
  const [editOwner, setEditOwner] = useState(profile?.owner_name || store.owner);
  const [isSaving, setIsSaving] = useState(false);

  // 팀 멤버 목록
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://ordercatch.app";
  const finalStoreSlug = storeInfo?.slug || profile?.store_slug || store.id;
  const finalStoreName = storeInfo?.name || profile?.store_name || store.name;
  const finalCategory = storeInfo?.category || profile?.category || store.type;
  const finalOwner = profile?.owner_name || store.owner;
  const inviteCode = storeInfo?.invite_code || "";

  const webhookUrl = `${baseUrl}/api/webhook/kakao?storeSlug=${finalStoreSlug}`;
  const orderLink = `${baseUrl}/order/${finalStoreSlug}`;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} 복사 완료!`, "success", "📋");
    } catch {
      showToast("복사 실패", "error");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await updateStoreProfile({
      store_name: editName,
      category: editCategory,
      owner_name: editOwner
    });
    setIsSaving(false);
    
    if (success) {
      showToast("매장 정보가 성공적으로 수정되었습니다.", "success");
      setIsEditing(false);
    } else {
      showToast("저장 중 오류가 발생했습니다.", "error");
    }
  };

  // 팀 탭 선택 시 멤버 로드
  useEffect(() => {
    if (activeTab === "team" && profile?.store_id) {
      loadTeamMembers();
    }
  }, [activeTab, profile?.store_id]);

  const loadTeamMembers = async () => {
    if (!profile?.store_id) return;
    setLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, owner_name, role")
        .eq("store_id", profile.store_id);

      if (!error && data) setTeamMembers(data as TeamMember[]);
    } catch (err) {
      console.error("loadTeamMembers error:", err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const categoryOptions = [
    { id: "dessert", label: "🍬 디저트" },
    { id: "nail", label: "💅 네일" },
    { id: "bakery", label: "🥐 베이커리" },
    { id: "flower", label: "🌸 플라워" },
    { id: "restaurant", label: "🍽️ 식당" },
    { id: "other", label: "✨ 기타" }
  ];

  const TABS = [
    { id: "general", label: "⚙️ 일반" },
    { id: "team", label: "👥 팀" },
    { id: "webhook", label: "🔗 웹훅" },
    { id: "link", label: "🛒 주문 링크" },
  ] as const;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(30px)",
          borderRadius: 24,
          width: "100%",
          maxWidth: 560,
          boxShadow: "0 40px 80px rgba(0,0,0,0.2)",
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 28px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44, height: 44, borderRadius: 12,
                background: store.color + "18",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
              }}
            >
              {store.avatar}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17, color: "var(--text-primary)" }}>
                매장 설정
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 1 }}>
                {finalStoreName}
                {!isMaster && (
                  <span style={{ marginLeft: 6, fontSize: 11, background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 100, fontWeight: 700 }}>
                    스태프
                  </span>
                )}
              </div>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ borderRadius: 10, padding: "6px 10px" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div style={{ padding: "20px 28px 0", display: "flex", gap: 4, flexWrap: "wrap" }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600,
                background: activeTab === tab.id ? "var(--accent)" : "transparent",
                color: activeTab === tab.id ? "#fff" : "var(--text-secondary)",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: "24px 28px 28px" }}>

          {/* ─── 일반 탭 ─── */}
          {activeTab === "general" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {!isEditing ? (
                <>
                  <InfoRow label="매장명" value={finalStoreName} />
                  <InfoRow label="업종" value={categoryOptions.find(c => c.id === finalCategory)?.label || "기타"} />
                  <InfoRow label="대표자" value={finalOwner} />
                  <InfoRow label="매장 ID" value={finalStoreSlug} mono />
                  <InfoRow label="내 역할" value={isMaster ? "👑 마스터 (사장님)" : "👤 스태프 (직원)"} />
                  
                  {isMaster && (
                    <button
                      onClick={() => setIsEditing(true)}
                      style={{
                        marginTop: 8, padding: "12px 16px", background: "rgba(0,122,255,0.08)",
                        borderRadius: 12, border: "1px solid rgba(0,122,255,0.2)", fontSize: 13,
                        color: "var(--accent)", fontWeight: 600, cursor: "pointer", display: "flex", justifyContent: "center"
                      }}
                    >
                      ✏️ 매장 정보 수정하기
                    </button>
                  )}
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 600 }}>매장명</label>
                    <input 
                      type="text" value={editName} onChange={e => setEditName(e.target.value)}
                      style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 14, outline: "none" }}
                    />
                  </div>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 600 }}>업종 카테고리</label>
                    <select
                      value={editCategory} onChange={e => setEditCategory(e.target.value)}
                      style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 14, outline: "none", background: "#fff" }}
                    >
                      {categoryOptions.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                    </select>
                  </div>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 600 }}>대표자 성함</label>
                    <input 
                      type="text" value={editOwner} onChange={e => setEditOwner(e.target.value)}
                      style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 14, outline: "none" }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button 
                      onClick={() => setIsEditing(false)} disabled={isSaving}
                      style={{ flex: 1, padding: "10px", borderRadius: 8, background: "var(--bg-secondary)", border: "none", fontWeight: 600, cursor: "pointer" }}
                    >
                      취소
                    </button>
                    <button 
                      onClick={handleSave} disabled={isSaving}
                      style={{ flex: 1, padding: "10px", borderRadius: 8, background: "var(--accent)", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer" }}
                    >
                      {isSaving ? "저장 중..." : "저장"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── 팀 탭 ─── */}
          {activeTab === "team" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* 초대 코드 (마스터만) */}
              {isMaster && inviteCode && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-tertiary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    👑 팀 초대 코드
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "16px 20px", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", borderRadius: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "0.2em", fontFamily: "monospace" }}>
                        {inviteCode}
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4, fontWeight: 600 }}>
                        이 코드를 직원에게 공유하세요
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(inviteCode, "초대 코드")}
                      style={{ padding: "10px 16px", background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(10px)" }}
                    >
                      📋 복사
                    </button>
                  </div>
                  <div style={{ marginTop: 8, padding: "10px 14px", background: "rgba(79,70,229,0.06)", borderRadius: 10, fontSize: 12, color: "#4f46e5", fontWeight: 600, lineHeight: 1.6 }}>
                    💡 직원이 앱 최초 로그인 시 "초대 코드로 합류하기"를 선택해 이 코드를 입력하면 같은 매장 데이터를 공유합니다.
                  </div>
                </div>
              )}

              {/* 스태프에게 안내 */}
              {!isMaster && (
                <div style={{ padding: "16px 18px", background: "#fef3c7", borderRadius: 14, border: "1px solid #fcd34d" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>👤 스태프 계정</div>
                  <div style={{ fontSize: 13, color: "#78350f", lineHeight: 1.6 }}>초대 코드 확인은 마스터(사장님)만 가능합니다.</div>
                </div>
              )}

              {/* 팀 멤버 목록 */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-tertiary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  현재 팀원 ({teamMembers.length}명)
                </div>
                {loadingMembers ? (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--text-tertiary)", fontSize: 13 }}>
                    불러오는 중...
                  </div>
                ) : teamMembers.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--text-tertiary)", fontSize: 13 }}>
                    팀원이 없습니다
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {teamMembers.map(member => (
                      <div
                        key={member.id}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "12px 16px", background: "var(--bg-secondary)",
                          borderRadius: 12, border: "1px solid var(--border)"
                        }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: "50%",
                          background: member.role === "master" ? "linear-gradient(135deg, #4f46e5, #7c3aed)" : "linear-gradient(135deg, #64748b, #94a3b8)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 16, flexShrink: 0
                        }}>
                          {member.role === "master" ? "👑" : "👤"}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
                            {member.owner_name || "이름 미설정"}
                            {member.id === profile?.id && (
                              <span style={{ marginLeft: 6, fontSize: 11, background: "#dbeafe", color: "#1d4ed8", padding: "2px 8px", borderRadius: 100, fontWeight: 700 }}>
                                나
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>{member.email}</div>
                        </div>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100,
                          background: member.role === "master" ? "rgba(79,70,229,0.1)" : "rgba(100,116,139,0.1)",
                          color: member.role === "master" ? "#4f46e5" : "#64748b"
                        }}>
                          {member.role === "master" ? "마스터" : "스태프"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── 웹훅 탭 ─── */}
          {activeTab === "webhook" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                향후 카카오 챗봇 관리자 센터에 아래 주소를 입력하세요. 수신된 주문 메시지가 자동으로 DB(장부)에 기록됩니다.
              </p>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  웹훅 엔드포인트
                </div>
                <div style={{ display: "flex", gap: 8, padding: "10px 14px", background: "#1c1c1e", borderRadius: 10, alignItems: "center" }}>
                  <code style={{ flex: 1, fontSize: 12, color: "#34c759", fontFamily: "var(--font-geist-mono)", overflowX: "auto", whiteSpace: "nowrap" }}>
                    {webhookUrl}
                  </code>
                  <button
                    className="btn btn-primary"
                    style={{ padding: "5px 12px", fontSize: 12, borderRadius: 7, flexShrink: 0 }}
                    onClick={() => copyToClipboard(webhookUrl, "웹훅 URL")}
                  >
                    복사
                  </button>
                </div>
              </div>
              <div style={{ padding: "12px 14px", background: "var(--accent-soft)", borderRadius: 12, border: "1px solid rgba(0,122,255,0.2)", fontSize: 12, color: "var(--accent)", lineHeight: 1.6 }}>
                📡 카카오 i 오픈빌더의 <b>[스킬 설정]</b> 메뉴에서 위 URL을 등록하고 주문 시나리오 파라미터와 연결해 주세요.
              </div>
            </div>
          )}

          {/* ─── 주문 링크 탭 ─── */}
          {activeTab === "link" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
                고객에게 이 링크를 공유하면, 고객이 직접 주문서를 작성하여 장부에 바로 등록됩니다.
              </p>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  매장 고유 주문 링크
                </div>
                <div style={{ display: "flex", gap: 8, padding: "10px 14px", background: "#1c1c1e", borderRadius: 10, alignItems: "center" }}>
                  <code style={{ flex: 1, fontSize: 12, color: "#5ac8fa", fontFamily: "var(--font-geist-mono)", overflowX: "auto", whiteSpace: "nowrap" }}>
                    {orderLink}
                  </code>
                  <button
                    className="btn btn-primary"
                    style={{ padding: "5px 12px", fontSize: 12, borderRadius: 7, flexShrink: 0 }}
                    onClick={() => copyToClipboard(orderLink, "주문 링크")}
                  >
                    복사
                  </button>
                </div>
              </div>
              <button
                className="btn"
                style={{ background: "rgba(0,0,0,0.06)", color: "var(--text-primary)", borderRadius: 10, padding: "10px 16px", width: "100%", fontSize: 14 }}
                onClick={() => {
                  if (typeof window !== "undefined") {
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(orderLink)}`;
                    window.open(qrUrl, "_blank");
                  }
                }}
              >
                📱 QR 코드 생성 →
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ width: 80, fontSize: 13, color: "var(--text-tertiary)", flexShrink: 0 }}>{label}</span>
      <span
        style={{
          fontSize: 14,
          color: "var(--text-primary)",
          fontFamily: mono ? "var(--font-geist-mono)" : "inherit",
          fontWeight: mono ? 400 : 500,
        }}
      >
        {value}
      </span>
    </div>
  );
}
