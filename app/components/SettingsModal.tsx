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
  const [activeTab, setActiveTab] = useState<"general" | "fields" | "template" | "team" | "subscription" | "webhook" | "link">("general");
  const { profile, storeInfo, isMaster, updateStoreProfile } = useStoreProvider();
  
  // 템플릿 설정 상태
  const [sampleText, setSampleText] = useState("");
  const [detectedFields, setDetectedFields] = useState<string[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [storeProductsList, setStoreProductsList] = useState<string[]>([]);
  const [newProductText, setNewProductText] = useState("");
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(storeInfo?.name || profile?.store_name || store.name);
  const [editCategory, setEditCategory] = useState(storeInfo?.category || profile?.category || store.type);
  const [editOwner, setEditOwner] = useState(profile?.owner_name || store.owner);
  const [isSaving, setIsSaving] = useState(false);

  // 입력 필드 활성화 설정 상태
  const [fieldsConfig, setFieldsConfig] = useState<Record<string, boolean>>({
    customerName: true,
    productName: true,
    pickupDate: true,
    phone: true,
    address: true,
    amount: true,
    memo: true,
  });

  interface CustomFieldItem {
    id: string;
    name: string;
    enabled: boolean;
  }

  // 커스텀 필드 목록
  const [customFields, setCustomFields] = useState<CustomFieldItem[]>([]);
  const [newFieldName, setNewFieldName] = useState("");

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

  // LocalStorage 필드 설정 로드
  useEffect(() => {
    if (profile?.store_id) {
      const saved = localStorage.getItem(`ordercatch_fields_config_${profile.store_id}`);
      if (saved) {
        try {
          setFieldsConfig(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse fields config", e);
        }
      }
      
      const savedCustom = localStorage.getItem(`ordercatch_custom_fields_${profile.store_id}`);
      if (savedCustom) {
        try {
          setCustomFields(JSON.parse(savedCustom));
        } catch (e) {
          console.error("Failed to parse custom fields", e);
        }
      }
    }
  }, [profile?.store_id]);

  // 템플릿 불러오기 및 customFields 동기화
  useEffect(() => {
    if (profile?.store_id) {
      const loadTemplateAndSync = async () => {
        try {
          const { data, error } = await supabase
            .from("store_order_templates")
            .select("sample_text, detected_fields, store_products")
            .eq("store_id", profile.store_id)
            .maybeSingle();

          if (!error && data) {
            setSampleText(data.sample_text || "");
            
            // 매장 취급 상품 설정 로드
            if (data.store_products) {
              const products = data.store_products.split(",").map((p: string) => p.trim()).filter(Boolean);
              setStoreProductsList(products);
              localStorage.setItem(`ordercatch_store_products_${profile.store_id}`, data.store_products);
            } else {
              setStoreProductsList([]);
              localStorage.removeItem(`ordercatch_store_products_${profile.store_id}`);
            }

            if (Array.isArray(data.detected_fields)) {
              setDetectedFields(data.detected_fields);

              // 로컬 custom fields 목록 병합 동기화
              const savedCustom = localStorage.getItem(`ordercatch_custom_fields_${profile.store_id}`);
              let localFields: CustomFieldItem[] = [];
              if (savedCustom) {
                try {
                  localFields = JSON.parse(savedCustom);
                } catch {}
              }

              // 원격 템플릿의 항목들을 로컬 필드로 동기화 (기존 속성 보존)
              const merged = data.detected_fields.map((field: string, idx: number) => {
                const existing = localFields.find(f => f.name === field);
                return existing || {
                  id: `synced_${idx}_${Date.now()}`,
                  name: field,
                  enabled: true
                };
              });

              setCustomFields(merged);
              localStorage.setItem(`ordercatch_custom_fields_${profile.store_id}`, JSON.stringify(merged));
              window.dispatchEvent(new Event("ordercatch_fields_changed"));
            }
          }
        } catch (err) {
          console.error("Failed to sync template and fields", err);
        }
      };

      loadTemplateAndSync();
    }
  }, [profile?.store_id]);

  const handleDetectFields = async () => {
    if (!sampleText.trim()) {
      showToast("샘플 주문서 내용을 입력해주세요.", "warning");
      return;
    }
    setIsDetecting(true);
    try {
      const res = await fetch("/api/orders/detect-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sampleText }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "감지 중 오류 발생");
      }
      const data = await res.json();
      setDetectedFields(data.fields || []);
      showToast("주문서 항목을 자동으로 추출했습니다!", "success");
    } catch (err: any) {
      showToast(err.message || "항목 감지 실패", "error");
    } finally {
      setIsDetecting(false);
    }
  };

  const handleAddProduct = () => {
    const trimmed = newProductText.trim();
    if (!trimmed) return;
    if (storeProductsList.includes(trimmed)) {
      showToast("이미 등록된 상품입니다.", "warning");
      return;
    }
    setStoreProductsList(prev => [...prev, trimmed]);
    setNewProductText("");
  };

  const handleRemoveProduct = (idxToRemove: number) => {
    setStoreProductsList(prev => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleSaveTemplate = async () => {
    if (!profile?.store_id) return;
    setIsSavingTemplate(true);
    try {
      const storeProductsStr = storeProductsList.join(", ");

      // 1. Supabase 업서트
      const { error } = await supabase
        .from("store_order_templates")
        .upsert({
          store_id: profile.store_id,
          sample_text: sampleText,
          detected_fields: detectedFields,
          store_products: storeProductsStr
        }, { onConflict: "store_id" });

      if (error) throw error;

      // 2. 로컬 스토리지 필드 동기화 및 업데이트
      const nextCustom = detectedFields.map((field, idx) => {
        const existing = customFields.find(f => f.name === field);
        return existing || {
          id: `auto_${idx}_${Date.now()}`,
          name: field,
          enabled: true
        };
      });

      setCustomFields(nextCustom);
      localStorage.setItem(`ordercatch_custom_fields_${profile.store_id}`, JSON.stringify(nextCustom));
      window.dispatchEvent(new Event("ordercatch_fields_changed"));

      showToast("템플릿과 필드 설정이 저장되었습니다.", "success");
    } catch (err: any) {
      console.error(err);
      showToast("저장 중 오류가 발생했습니다.", "error");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} 복사 완료!`, "success");
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
    setIsSaving(true);
    
    if (success) {
      showToast("매장 정보가 성공적으로 수정되었습니다.", "success");
      setIsEditing(false);
    } else {
      showToast("저장 중 오류가 발생했습니다.", "error");
    }
    setIsSaving(false);
  };

  const toggleField = (fieldKey: string) => {
    // 고객명과 상품명은 강제 필수 필드로 지정
    if (fieldKey === "customerName" || fieldKey === "productName") {
      showToast("고객명과 상품명은 주문 등록을 위한 필수 필드입니다.", "warning");
      return;
    }

    const nextConfig = {
      ...fieldsConfig,
      [fieldKey]: !fieldsConfig[fieldKey],
    };
    setFieldsConfig(nextConfig);

    if (profile?.store_id) {
      localStorage.setItem(
        `ordercatch_fields_config_${profile.store_id}`,
        JSON.stringify(nextConfig)
      );
      // 이벤트 발행하여 PasteBoard 등에서 상태 즉시 업데이트
      window.dispatchEvent(new Event("ordercatch_fields_changed"));
    }
  };

  const handleAddCustomField = () => {
    if (!newFieldName.trim()) return;
    const cleanName = newFieldName.trim();
    
    // 기본 필드 명칭과 중복 방지
    const defaultLabels = ["고객명", "상품명", "예약/픽업일시", "연락처", "배송주소", "금액", "메모"];
    if (defaultLabels.includes(cleanName)) {
      showToast("기본 주문서 항목과 동일한 이름은 추가할 수 없습니다.", "warning");
      return;
    }

    if (customFields.some(f => f.name === cleanName)) {
      showToast("이미 존재하는 항목 이름입니다.", "warning");
      return;
    }

    const nextCustom = [
      ...customFields,
      { id: Date.now().toString(), name: cleanName, enabled: true }
    ];
    setCustomFields(nextCustom);
    setNewFieldName("");
    
    if (profile?.store_id) {
      localStorage.setItem(`ordercatch_custom_fields_${profile.store_id}`, JSON.stringify(nextCustom));
      window.dispatchEvent(new Event("ordercatch_fields_changed"));
    }
    showToast("새 항목이 추가되었습니다.", "success");
  };

  const toggleCustomField = (id: string) => {
    const nextCustom = customFields.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f);
    setCustomFields(nextCustom);
    if (profile?.store_id) {
      localStorage.setItem(`ordercatch_custom_fields_${profile.store_id}`, JSON.stringify(nextCustom));
      window.dispatchEvent(new Event("ordercatch_fields_changed"));
    }
  };

  const handleDeleteCustomField = (id: string) => {
    const nextCustom = customFields.filter(f => f.id !== id);
    setCustomFields(nextCustom);
    if (profile?.store_id) {
      localStorage.setItem(`ordercatch_custom_fields_${profile.store_id}`, JSON.stringify(nextCustom));
      window.dispatchEvent(new Event("ordercatch_fields_changed"));
    }
    showToast("항목이 삭제되었습니다.", "info");
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
    { id: "dessert", label: "디저트" },
    { id: "nail", label: "네일" },
    { id: "bakery", label: "베이커리" },
    { id: "flower", label: "플라워" },
    { id: "restaurant", label: "식당" },
    { id: "other", label: "기타" }
  ];

  const TABS = [
    { id: "general", label: "일반" },
    { id: "fields", label: "주문서 필드 설정" },
    { id: "template", label: "주문서 템플릿" },
    { id: "team", label: "팀 관리" },
    { id: "subscription", label: "구독 관리" },
    { id: "webhook", label: "웹훅 연동", isBeta: true },
    { id: "link", label: "주문 링크", isBeta: true },
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
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={store.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "var(--text-primary)" }}>
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
                padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 700,
                background: activeTab === tab.id ? "var(--accent)" : "transparent",
                color: activeTab === tab.id ? "#fff" : "var(--text-secondary)",
                transition: "all 0.15s",
                display: "inline-flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <span>{tab.label}</span>
              {"isBeta" in tab && tab.isBeta && (
                <span style={{
                  fontSize: 10,
                  padding: "1px 5px",
                  borderRadius: 4,
                  background: activeTab === tab.id ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.06)",
                  color: activeTab === tab.id ? "#fff" : "#94a3b8",
                  fontWeight: 800,
                  transition: "all 0.15s"
                }}>
                  준비중
                </span>
              )}
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
                  <InfoRow label="내 역할" value={isMaster ? "마스터 (사장님)" : "스태프 (직원)"} />
                  
                  {isMaster && (
                    <button
                      onClick={() => setIsEditing(true)}
                      style={{
                        marginTop: 8, padding: "12px 16px", background: "rgba(0,122,255,0.08)",
                        borderRadius: 12, border: "1px solid rgba(0,122,255,0.2)", fontSize: 13,
                        color: "var(--accent)", fontWeight: 700, cursor: "pointer", display: "flex", justifyContent: "center"
                      }}
                    >
                      매장 정보 수정하기
                    </button>
                  )}
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 700 }}>매장명</label>
                    <input 
                      type="text" value={editName} onChange={e => setEditName(e.target.value)}
                      style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 14, outline: "none" }}
                    />
                  </div>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 700 }}>업종 카테고리</label>
                    <select
                      value={editCategory} onChange={e => setEditCategory(e.target.value)}
                      style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 14, outline: "none", background: "#fff" }}
                    >
                      {categoryOptions.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                    </select>
                  </div>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 700 }}>대표자 성함</label>
                    <input 
                      type="text" value={editOwner} onChange={e => setEditOwner(e.target.value)}
                      style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 14, outline: "none" }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button 
                      onClick={() => setIsEditing(false)} disabled={isSaving}
                      style={{ flex: 1, padding: "10px", borderRadius: 8, background: "var(--bg-secondary)", border: "none", fontWeight: 700, cursor: "pointer" }}
                    >
                      취소
                    </button>
                    <button 
                      onClick={handleSave} disabled={isSaving}
                      style={{ flex: 1, padding: "10px", borderRadius: 8, background: "var(--accent)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}
                    >
                      {isSaving ? "저장 중..." : "저장"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── 입력 필드 커스텀 탭 ─── */}
          {activeTab === "fields" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 8 }}>
                복붙 마법사 및 수기 입력으로 주문 등록 시 노출할 주문서 항목을 활성화/비활성화할 수 있습니다. 매장 운영에 꼭 필요한 필드만 활성화하여 한눈에 들어오는 심플한 입력창을 만들어보세요.
              </div>

              {/* 기본 필드 영역 */}
              <div style={{ background: "#f8fafc", borderRadius: 16, border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
                {([
                  { key: "customerName", label: "고객명", required: true },
                  { key: "productName", label: "상품명", required: true },
                  { key: "pickupDate", label: "예약/픽업일시", required: false },
                  { key: "phone", label: "연락처", required: false },
                  { key: "address", label: "배송주소", required: false },
                  { key: "amount", label: "금액", required: false },
                  { key: "memo", label: "메모", required: false },
                ] as const).map((field, idx, arr) => {
                  const isEnabled = fieldsConfig[field.key];
                  return (
                    <div 
                      key={field.key} 
                      onClick={() => !field.required && toggleField(field.key)}
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "space-between", 
                        padding: "14px 20px", 
                        borderBottom: idx < arr.length - 1 || customFields.length > 0 ? "1px solid rgba(0,0,0,0.05)" : "none",
                        cursor: field.required ? "default" : "pointer",
                        background: field.required ? "rgba(0,0,0,0.01)" : "transparent"
                      }}
                    >
                      <div>
                        <span style={{ fontSize: 15, fontWeight: 700, color: field.required ? "#94a3b8" : "var(--text-primary)" }}>
                          {field.label}
                        </span>
                        {field.required && (
                          <span style={{ marginLeft: 8, fontSize: 11, background: "#e2e8f0", color: "#64748b", padding: "2px 6px", borderRadius: 6, fontWeight: 700 }}>
                            필수 항목
                          </span>
                        )}
                      </div>
                      
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <div style={{
                          width: 44,
                          height: 24,
                          borderRadius: 12,
                          background: isEnabled ? "var(--accent)" : "#cbd5e1",
                          position: "relative",
                          transition: "background 0.2s ease",
                          opacity: field.required ? 0.6 : 1
                        }}>
                          <div style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: "#fff",
                            position: "absolute",
                            top: 3,
                            left: isEnabled ? 23 : 3,
                            transition: "left 0.2s ease",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                          }} />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* 커스텀 필드 영역 */}
                {customFields.map((field, idx) => {
                  return (
                    <div 
                      key={field.id}
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "space-between", 
                        padding: "14px 20px", 
                        borderBottom: idx < customFields.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                        background: "transparent"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                          {field.name}
                        </span>
                        <span style={{ fontSize: 10, background: "rgba(79, 70, 229, 0.08)", color: "var(--accent)", padding: "2px 6px", borderRadius: 6, fontWeight: 700 }}>
                          맞춤 항목
                        </span>
                      </div>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        {/* 토글 스위치 */}
                        <div 
                          onClick={() => toggleCustomField(field.id)}
                          style={{
                            width: 44,
                            height: 24,
                            borderRadius: 12,
                            background: field.enabled ? "var(--accent)" : "#cbd5e1",
                            position: "relative",
                            transition: "background 0.2s ease",
                            cursor: "pointer"
                          }}
                        >
                          <div style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: "#fff",
                            position: "absolute",
                            top: 3,
                            left: field.enabled ? 23 : 3,
                            transition: "left 0.2s ease",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                          }} />
                        </div>

                        {/* 삭제 버튼 */}
                        <button 
                          onClick={() => handleDeleteCustomField(field.id)}
                          style={{ 
                            background: "none", 
                            border: "none", 
                            padding: 4, 
                            cursor: "pointer", 
                            color: "#ef4444", 
                            display: "flex", 
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 6,
                            transition: "background 0.2s"
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)"}
                          onMouseLeave={e => e.currentTarget.style.background = "none"}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 커스텀 필드 추가 폼 */}
              <div style={{ 
                marginTop: 6, 
                padding: 16, 
                background: "rgba(79, 70, 229, 0.03)", 
                border: "1.5px dashed rgba(79, 70, 229, 0.15)", 
                borderRadius: 16,
                display: "flex",
                flexDirection: "column",
                gap: 8
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "var(--accent)" }}>나만의 항목 추가</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input 
                    type="text" 
                    value={newFieldName}
                    onChange={e => setNewFieldName(e.target.value)}
                    placeholder="예: 맛 선택, 레터링 문구, 디자인 옵션"
                    style={{ 
                      flex: 1, 
                      padding: "10px 14px", 
                      borderRadius: 10, 
                      border: "1px solid #cbd5e1", 
                      fontSize: 13, 
                      outline: "none",
                      background: "#fff"
                    }}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomField();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddCustomField}
                    style={{
                      padding: "0 16px",
                      background: "var(--accent)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "transform 0.1s"
                    }}
                    onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
                    onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
                  >
                    추가
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── 주문서 템플릿 탭 ─── */}
          {activeTab === "template" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                매장에서 실제로 사용하는 주문서 예시(샘플)를 등록해주세요. AI가 주문서 항목들을 감지하여 자동으로 장부 양식(커스텀 필드)을 생성하고 파싱 정확도를 극대화합니다.
              </div>

              {/* 매장 취급 상품 설정 영역 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "#f8fafc", padding: 16, borderRadius: 16, border: "1px solid rgba(0,0,0,0.05)" }}>
                <label style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 800 }}>📦 매장 판매 상품(메뉴) 관리</label>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.4 }}>
                  매장에서 실제 판매 중인 품목(메뉴)명을 하나씩 입력해 추가해 주세요. AI가 주문서 텍스트 중 유사한 단어를 상품명으로 정확히 감지하는 데 도움을 줍니다.
                </div>
                
                {/* 상품 추가 입력필드 */}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <input
                    type="text"
                    value={newProductText}
                    onChange={(e) => setNewProductText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddProduct();
                      }
                    }}
                    placeholder="예: 백설기, 흑임자설기, 꽃케이크, 송편"
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid #cbd5e1",
                      fontSize: 13,
                      outline: "none",
                      background: "#fff"
                    }}
                  />
                  <button
                    onClick={handleAddProduct}
                    style={{
                      padding: "10px 16px",
                      background: "var(--accent)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer"
                    }}
                  >
                    추가
                  </button>
                </div>

                {/* 등록된 상품 목록 배지 */}
                {storeProductsList.length > 0 ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                    {storeProductsList.map((product, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: 12,
                          background: "#fff",
                          border: "1px solid #e2e8f0",
                          color: "var(--text-primary)",
                          padding: "6px 12px",
                          borderRadius: 8,
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                        }}
                      >
                        {product}
                        <button
                          onClick={() => handleRemoveProduct(idx)}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                            color: "#ef4444",
                            fontSize: 11,
                            fontWeight: 900,
                            marginLeft: 2
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 6, textAlign: "center", padding: "8px 0" }}>
                    등록된 상품이 없습니다. 판매하는 주요 제품명을 추가해 보세요!
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 700 }}>주문서 샘플 등록</label>
                <textarea
                  value={sampleText}
                  onChange={(e) => setSampleText(e.target.value)}
                  placeholder="예시:&#13;1. 성함/연락처 : 홍길동 010-1234-5678&#13;2. 픽업시간 : 토요일 2시반&#13;3. 사이즈 : 2호&#13;4. 문구 : 생일축하해"
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    outline: "none",
                    background: "#fff",
                    minHeight: 120,
                    resize: "vertical",
                    lineHeight: 1.5,
                    fontFamily: "inherit"
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleDetectFields}
                  disabled={isDetecting || !sampleText.trim()}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    background: "rgba(79, 70, 229, 0.08)",
                    border: "1px solid rgba(79, 70, 229, 0.2)",
                    borderRadius: 10,
                    fontSize: 13,
                    color: "var(--accent)",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s"
                  }}
                >
                  {isDetecting ? "항목 분석 중..." : "✨ AI 항목 자동 감지"}
                </button>
              </div>

              {detectedFields.length > 0 && (
                <div style={{ background: "#f8fafc", padding: 16, borderRadius: 14, border: "1px solid rgba(0,0,0,0.05)" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-secondary)", marginBottom: 8 }}>
                    감지된 맞춤 주문서 항목
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {detectedFields.map((field, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: 12,
                          background: "#fff",
                          border: "1px solid #cbd5e1",
                          color: "var(--text-primary)",
                          padding: "4px 10px",
                          borderRadius: 8,
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6
                        }}
                      >
                        {field}
                        <button
                          onClick={() => setDetectedFields(prev => prev.filter((_, i) => i !== idx))}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                            color: "#94a3b8",
                            fontSize: 10,
                            fontWeight: 900
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 8 }}>
                    * 필요 없는 항목은 ✕를 눌러 삭제할 수 있습니다.
                  </div>
                </div>
              )}

              <button
                onClick={handleSaveTemplate}
                disabled={isSavingTemplate}
                style={{
                  marginTop: 8,
                  padding: "12px 16px",
                  background: "var(--accent)",
                  borderRadius: 12,
                  border: "none",
                  fontSize: 13,
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "center"
                }}
              >
                {isSavingTemplate ? "템플릿 저장 중..." : "이 템플릿으로 주문 설정 저장"}
              </button>
            </div>
          )}

          {/* ─── 팀 탭 ─── */}
          {activeTab === "team" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* 초대 코드 (마스터만) */}
              {isMaster && inviteCode && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-tertiary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    팀 초대 코드
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
                      복사
                    </button>
                  </div>
                  <div style={{ marginTop: 8, padding: "10px 14px", background: "rgba(79,70,229,0.06)", borderRadius: 10, fontSize: 12, color: "#4f46e5", fontWeight: 600, lineHeight: 1.6 }}>
                    직원이 앱 최초 로그인 시 "초대 코드로 합류하기"를 선택해 이 코드를 입력하면 같은 매장 데이터를 공유합니다.
                  </div>
                </div>
              )}

              {/* 스태프에게 안내 */}
              {!isMaster && (
                <div style={{ padding: "16px 18px", background: "#fef3c7", borderRadius: 14, border: "1px solid #fcd34d" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>스태프 계정</div>
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
                          color: "#fff",
                          fontSize: 13, fontWeight: 700, flexShrink: 0
                        }}>
                          {member.role === "master" ? "M" : "S"}
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

          {/* ─── 구독 관리 탭 ─── */}
          {activeTab === "subscription" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ padding: "16px 20px", background: profile?.subscription_status === "pro" ? "linear-gradient(135deg, #4f46e5, #7c3aed)" : "#f8fafc", borderRadius: 16, border: profile?.subscription_status === "pro" ? "none" : "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: profile?.subscription_status === "pro" ? "rgba(255,255,255,0.8)" : "#64748b", marginBottom: 4 }}>
                  현재 이용 중인 플랜
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: profile?.subscription_status === "pro" ? "#fff" : "#0f172a" }}>
                  {profile?.subscription_status === "pro" ? "PRO 무제한 요금제" : "무료 요금제"}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
                  환불 규정 및 해지 안내
                </div>
                <div style={{ padding: "16px", background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
                    <li><strong style={{ color: "var(--text-primary)" }}>전액 환불:</strong> 결제일로부터 7일 이내에 서비스 이용 이력(주문 생성 등)이 없는 경우 전액 환불됩니다.</li>
                    <li><strong style={{ color: "var(--text-primary)" }}>환불 불가:</strong> 7일이 경과하거나 1회 이상 기능을 사용한 경우, 해당 월 요금은 환불되지 않으며 다음 결제일부터 자동으로 해지됩니다.</li>
                    <li><strong style={{ color: "var(--text-primary)" }}>정기 결제 해지:</strong> 아래 버튼을 통해 언제든지 위약금 없이 해지 신청을 하실 수 있습니다.</li>
                  </ul>
                  <a href="/refund-policy" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 12, color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>
                    자세한 환불 정책 전문 보기 →
                  </a>
                </div>
              </div>

              {profile?.subscription_status === "pro" && (
                <div style={{ marginTop: 8 }}>
                  <button 
                    onClick={() => {
                      if(confirm("정말 구독을 해지하시겠습니까? 이번 결제 주기까지만 PRO 기능이 유지됩니다.")) {
                        showToast("준비 중인 기능입니다. 고객센터에 문의해주세요.", "info");
                      }
                    }}
                    style={{ width: "100%", padding: "14px", background: "#fff", border: "1px solid #fecaca", borderRadius: 12, color: "#ef4444", fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.2s" }}
                    onMouseOver={(e) => (e.currentTarget.style.background = "#fef2f2")}
                    onMouseOut={(e) => (e.currentTarget.style.background = "#fff")}
                  >
                    정기 결제 해지하기
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ─── 웹훅 탭 ─── */}
          {activeTab === "webhook" && (
            <div style={{ position: "relative", minHeight: 200, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", gap: 16, padding: "8px 0" }}>
              {/* 콘텐츠 블러처리 */}
              <div style={{ filter: "blur(3.5px)", opacity: 0.35, pointerEvents: "none", display: "flex", flexDirection: "column", gap: 16 }}>
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
                  카카오 i 오픈빌더의 스킬 설정 메뉴에서 위 URL을 등록하고 주문 시나리오 파라미터와 연결해 주세요.
                </div>
              </div>

              {/* 준비중 오버레이 */}
              <div style={{
                position: "absolute", inset: 0,
                background: "rgba(255,255,255,0.6)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                textAlign: "center", padding: 24, zIndex: 10,
                backdropFilter: "blur(1px)",
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 16, background: "rgba(79, 70, 229, 0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)",
                  fontSize: 22, marginBottom: 12
                }}>
                  ⚙️
                </div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text-primary)", marginBottom: 4 }}>
                  카카오 웹훅 연동 준비 중
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 300 }}>
                  더 간편하고 안정적인 카카오톡 주문 접수 알림 연동 기능을 열심히 개발하고 있습니다. 조금만 기다려주세요!
                </div>
              </div>
            </div>
          )}

          {/* ─── 주문 링크 탭 ─── */}
          {activeTab === "link" && (
            <div style={{ position: "relative", minHeight: 200, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", gap: 16, padding: "8px 0" }}>
              {/* 콘텐츠 블러처리 */}
              <div style={{ filter: "blur(3.5px)", opacity: 0.35, pointerEvents: "none", display: "flex", flexDirection: "column", gap: 16 }}>
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
                    >
                      복사
                    </button>
                  </div>
                </div>
                <button
                  className="btn"
                  style={{ background: "rgba(0,0,0,0.06)", color: "var(--text-primary)", borderRadius: 10, padding: "10px 16px", width: "100%", fontSize: 14 }}
                >
                  QR 코드 생성 →
                </button>
              </div>

              {/* 준비중 오버레이 */}
              <div style={{
                position: "absolute", inset: 0,
                background: "rgba(255,255,255,0.6)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                textAlign: "center", padding: 24, zIndex: 10,
                backdropFilter: "blur(1px)",
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 16, background: "rgba(79, 70, 229, 0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)",
                  fontSize: 22, marginBottom: 12
                }}>
                  🔗
                </div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text-primary)", marginBottom: 4 }}>
                  주문서 직접 제출 링크 준비 중
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 300 }}>
                  고객용 비회원 주문 접수 페이지 및 링크 연동 기능을 더욱 안전하고 완성도 높게 개발 중입니다. 조금만 기다려주세요!
                </div>
              </div>
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
