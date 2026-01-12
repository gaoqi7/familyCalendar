import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiGet, apiPatch, apiPost, apiUpload } from "../api.js";
import { setLanguage } from "../i18n.js";
import usePoll from "../hooks/usePoll.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const Settings = () => {
  const { t, i18n } = useTranslation();
  const [household, setHousehold] = useState({ name: "", default_language: "en" });
  const [members, setMembers] = useState([]);
  const [memberName, setMemberName] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [editingAvatarFile, setEditingAvatarFile] = useState(null);
  const [editingPreviewUrl, setEditingPreviewUrl] = useState("");
  const [editError, setEditError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [cameraTarget, setCameraTarget] = useState("new");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const load = async () => {
    const [householdData, membersData] = await Promise.all([
      apiGet("/api/household"),
      apiGet("/api/members")
    ]);
    setHousehold(householdData);
    setMembers(membersData);
  };

  usePoll(load, 30000);

  useEffect(() => {
    if (!cameraOpen) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      return;
    }
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(() => {});
            setCameraReady(true);
          };
        }
      } catch (error) {
        console.error(error);
        setCameraError(t("members.cameraError"));
      }
    };
    startCamera();
  }, [cameraOpen, t]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  useEffect(() => {
    if (!editingAvatarFile) {
      setEditingPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(editingAvatarFile);
    setEditingPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [editingAvatarFile]);

  const handleLanguageChange = async (event) => {
    const nextLang = event.target.value;
    setLanguage(nextLang);
    await apiPatch("/api/household", { defaultLanguage: nextLang });
    setHousehold({ ...household, default_language: nextLang });
  };

  const handleMemberSubmit = async (event) => {
    event.preventDefault();
    if (!memberName.trim()) {
      return;
    }
    const member = await apiPost("/api/members", { name: memberName.trim() });
    if (avatarFile) {
      const formData = new FormData();
      formData.append("file", avatarFile);
      await apiUpload(`/api/members/${member.id}/avatar`, formData);
    }
    setMemberName("");
    setAvatarFile(null);
    await load();
  };

  const startEditMember = (member) => {
    setEditingMemberId(member.id);
    setEditingName(member.name);
    setEditingAvatarFile(null);
    setEditingPreviewUrl("");
    setEditError("");
    setDeleteError("");
  };

  const cancelEditMember = () => {
    setEditingMemberId(null);
    setEditingName("");
    setEditingAvatarFile(null);
    setEditingPreviewUrl("");
    setEditError("");
    setDeleteError("");
  };

  const handleEditSave = async (memberId) => {
    if (!editingName.trim()) {
      return;
    }
    setEditError("");
    setDeleteError("");
    try {
      await apiPatch(`/api/members/${memberId}`, {
        name: editingName.trim()
      });
      if (editingAvatarFile) {
        const formData = new FormData();
        formData.append("file", editingAvatarFile);
        await apiUpload(`/api/members/${memberId}/avatar`, formData);
      }
    } catch (error) {
      console.error(error);
      setEditError("Save failed. Please try again.");
      return;
    }
    cancelEditMember();
    await load();
  };

  const handleDeleteMember = async (memberId) => {
    const password = window.prompt(t("members.deletePrompt"));
    if (!password) {
      return;
    }
    setDeleteError("");
    try {
      await apiPost(`/api/members/${memberId}/delete`, { password });
      await load();
    } catch (error) {
      console.error(error);
      setDeleteError(t("members.deleteFailed"));
    }
  };

  const handleOpenCamera = () => {
    setCameraError("");
    setCameraReady(false);
    setCameraTarget("new");
    setCameraOpen(true);
  };

  const handleOpenEditCamera = () => {
    setCameraError("");
    setCameraReady(false);
    setCameraTarget("edit");
    setCameraOpen(true);
  };

  const handleCapture = () => {
    if (!videoRef.current) {
      return;
    }
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      setCameraError(t("members.cameraError"));
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      if (cameraTarget === "edit") {
        setEditingAvatarFile(file);
      } else {
        setAvatarFile(file);
      }
      setCameraOpen(false);
    }, "image/jpeg", 0.9);
  };

  const canCapture =
    cameraOpen && !cameraError && Boolean(streamRef.current) && cameraReady;

  return (
    <section className="page">
      <h1>{t("settings.title")}</h1>

      <div className="card form">
        <div className="form-row">
          <label>{t("settings.language")}</label>
          <select value={i18n.language} onChange={handleLanguageChange}>
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
        </div>
      </div>

      <div className="card form">
        <h2>{t("members.title")}</h2>
        <form className="inline-form" onSubmit={handleMemberSubmit}>
          <input
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
            placeholder={t("members.addMember")}
          />
          <label className="file-label">
            {t("members.avatar")}
            <input
              type="file"
              accept="image/*"
              capture="user"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
            />
          </label>
          {avatarPreviewUrl ? (
            <img className="avatar-preview" src={avatarPreviewUrl} alt="preview" />
          ) : null}
          <button type="button" className="ghost-button" onClick={handleOpenCamera}>
            {t("members.openCamera")}
          </button>
          <button type="submit">{t("members.addMember")}</button>
        </form>
        {cameraError ? <div className="error-text">{cameraError}</div> : null}
        {deleteError ? <div className="error-text">{deleteError}</div> : null}
        <div className="list">
          {members.map((member) => (
            <div key={member.id} className="list-item">
              {editingMemberId === member.id ? (
                <div className="member-edit">
                  {editingPreviewUrl || member.avatar_path ? (
                    <img
                      className="member-avatar"
                      src={
                        editingPreviewUrl ||
                        `${API_BASE}${member.avatar_path}`
                      }
                      alt={member.name}
                    />
                  ) : (
                    <div className="member-avatar placeholder">
                      {member.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                  />
                  <label className="file-label">
                    {t("members.updateAvatar")}
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={(e) =>
                        setEditingAvatarFile(e.target.files?.[0] || null)
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={handleOpenEditCamera}
                  >
                    {t("members.openCamera")}
                  </button>
                  <div className="member-edit-actions">
                    <button type="button" onClick={() => handleEditSave(member.id)}>
                      {t("members.save")}
                    </button>
                    <button type="button" className="ghost-button" onClick={cancelEditMember}>
                      {t("members.cancel")}
                    </button>
                  </div>
                  {editError ? <div className="error-text">{editError}</div> : null}
                </div>
              ) : (
                <>
                  {member.avatar_path ? (
                    <img
                      className="member-avatar"
                      src={`${API_BASE}${member.avatar_path}`}
                      alt={member.name}
                    />
                  ) : (
                    <div className="member-avatar placeholder">
                      {member.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="list-title">{member.name}</div>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => startEditMember(member)}
                  >
                    {t("members.edit")}
                  </button>
                  <button
                    type="button"
                    className="ghost-button danger-button"
                    onClick={() => handleDeleteMember(member.id)}
                  >
                    {t("members.delete")}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {cameraOpen ? (
        <div className="camera-modal">
          <div className="camera-card">
            <video ref={videoRef} autoPlay playsInline className="camera-video" />
            <div className="camera-actions">
              <button type="button" onClick={handleCapture} disabled={!canCapture}>
                {t("members.capture")}
              </button>
              <button type="button" className="ghost-button" onClick={() => setCameraOpen(false)}>
                {t("members.cancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default Settings;
