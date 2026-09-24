"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownTrayIcon,
  SparklesIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  UserIcon,
  BriefcaseIcon,
  BuildingOffice2Icon,
  ChatBubbleBottomCenterTextIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import ImageUploadWithCrop from "./ImageUploadWithCrop";
import { renderWMHDBanner } from "@/lib/wmhd-renderer";
import { PRESET_MESSAGES, CUSTOM_MESSAGE_OPTION } from "@/lib/messages";

interface FormData {
  name: string;
  designation: string;
  organization: string;
  message: string;
  imageData?: string;
}

const SAMPLE_DATA: FormData = {
  name: "Muzamil Patel",
  designation: "General Manager",
  organization: "Hiranis Pharmaceuticals (Pvt) Ltd",
  message: PRESET_MESSAGES[0],
};

const PosterBuilder: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    designation: "",
    organization: "",
    message: PRESET_MESSAGES[0],
  });

  // Tracks which dropdown option is active: a preset index (as string) or the custom option
  const [messageChoice, setMessageChoice] = useState<string>("0");
  const [customMessage, setCustomMessage] = useState("");

  const [isDownloading, setIsDownloading] = useState(false);
  const [cloudinaryUrl, setCloudinaryUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Update form fields
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Message dropdown: either selects a preset message or switches to custom mode
  const handleMessageChoiceChange = (value: string) => {
    setMessageChoice(value);
    if (value === CUSTOM_MESSAGE_OPTION) {
      handleInputChange("message", customMessage);
    } else {
      handleInputChange("message", PRESET_MESSAGES[parseInt(value, 10)] ?? "");
    }
  };

  const handleCustomMessageChange = (value: string) => {
    setCustomMessage(value);
    handleInputChange("message", value);
  };

  // Re-render canvas whenever form data changes
  const updateCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      await renderWMHDBanner(canvas, {
        name: formData.name,
        designation: formData.designation,
        organization: formData.organization,
        message: formData.message,
        imageData: formData.imageData,
      });
    } catch (err) {
      console.error("Canvas render error:", err);
    }
  }, [formData]);

  useEffect(() => {
    updateCanvas();
  }, [updateCanvas]);

  // Load sample data button
  const handleLoadSample = () => {
    setFormData((prev) => ({
      ...prev,
      name: SAMPLE_DATA.name,
      designation: SAMPLE_DATA.designation,
      organization: SAMPLE_DATA.organization,
      message: SAMPLE_DATA.message,
    }));
    setMessageChoice("0");
    toast.success("Loaded sample details from official poster!");
  };

  // Clear all
  const handleReset = () => {
    setFormData({
      name: "",
      designation: "",
      organization: "",
      message: PRESET_MESSAGES[0],
      imageData: undefined,
    });
    setMessageChoice("0");
    setCustomMessage("");
    setCloudinaryUrl(null);
    toast("Form reset", { icon: "🧹" });
  };

  // Download & Upload to Cloudinary
  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      toast.error("Banner canvas not ready");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Please enter your name before downloading");
      return;
    }

    setIsDownloading(true);
    const loadingToast = toast.loading("Generating your 1754×1240 banner...");

    try {
      // Ensure canvas is cleanly drawn
      await updateCanvas();
      await new Promise((r) => setTimeout(r, 200));

      const dataUrl = canvas.toDataURL("image/jpeg", 0.96);

      // 1. Trigger direct browser download
      const cleanName = formData.name
        .trim()
        .replace(/[^a-zA-Z0-9]/g, "_")
        .slice(0, 30);
      const filename = `${cleanName || "WMHD"}_2026_${Date.now()}`;

      // iOS Safari ignores the `download` attribute and just navigates to the
      // image, so hand it to the native share sheet (Save Image) instead.
      const isIOS =
        typeof navigator !== "undefined" &&
        (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
          (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

      if (isIOS && typeof navigator.share === "function") {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], `${filename}.jpg`, { type: "image/jpeg" });
          if (navigator.canShare && !navigator.canShare({ files: [file] })) {
            throw new Error("File sharing not supported");
          }
          await navigator.share({
            files: [file],
            title: "World Mental Health Day 2026 Banner",
          });
          toast.success("Banner ready — save it from the share sheet! 🎉", {
            id: loadingToast,
          });
        } catch (shareErr) {
          if ((shareErr as { name?: string })?.name === "AbortError") {
            toast.dismiss(loadingToast);
          } else {
            window.open(dataUrl, "_blank");
            toast.success("Opened in a new tab — tap and hold the image to save it. 🎉", {
              id: loadingToast,
            });
          }
        }
      } else {
        const link = document.createElement("a");
        link.download = `${filename}.jpg`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("Banner downloaded successfully! 🎉", { id: loadingToast });
      }

      // 2. Upload to Cloudinary in the background
      toast.loading("Saving banner to Cloudinary...", { id: "cloud-upload" });

      try {
        const uploadRes = await fetch("/api/upload-poster", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataUrl,
            filename,
          }),
        });

        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.url) {
          setCloudinaryUrl(uploadData.url);
          toast.success("Stored on Cloudinary! Cloud URL generated.", {
            id: "cloud-upload",
          });
        } else {
          toast.dismiss("cloud-upload");
          console.warn("Cloudinary upload response:", uploadData);
        }
      } catch (uploadErr) {
        console.error("Cloudinary upload failed:", uploadErr);
        toast.dismiss("cloud-upload");
      }
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Failed to generate download. Please try again.", {
        id: loadingToast,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyLink = () => {
    if (!cloudinaryUrl) return;
    navigator.clipboard.writeText(cloudinaryUrl);
    setIsCopied(true);
    toast.success("Cloudinary link copied to clipboard!");
    setTimeout(() => setIsCopied(false), 3000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Controls */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-5 space-y-6"
        >
          {/* Card 1: Photo Upload */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>📸</span>
                  <span>Your Photo</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Upload 1 portrait image to frame inside the official banner
                </p>
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Single Photo
              </span>
            </div>

            <ImageUploadWithCrop
              onImageChange={(img) => handleInputChange("imageData", img || "")}
              initialImage={formData.imageData}
            />
          </div>

          {/* Card 2: Message Box */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>💌</span>
                  <span>Message Box</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Displayed on the banner's identification card
                </p>
              </div>
              <button
                type="button"
                onClick={handleLoadSample}
                className="text-xs font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-xl border border-sky-200 transition-colors flex items-center gap-1.5"
                title="Fill sample info from sample banner"
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                Sample Data
              </button>
            </div>

            {/* Input 1: Full Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <UserIcon className="w-4 h-4 text-sky-600" />
                Full Name <span className="text-emerald-600 font-bold">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g. Muzamil Patel / Dr. Sarah Jenkins"
                maxLength={45}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-medium text-sm sm:text-base"
              />
            </div>

            {/* Input 2: Role / Designation */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <BriefcaseIcon className="w-4 h-4 text-emerald-600" />
                Role / Designation <span className="text-slate-400 font-normal">(Title)</span>
              </label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => handleInputChange("designation", e.target.value)}
                placeholder="e.g. General Manager / Clinical Psychologist"
                maxLength={55}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-medium text-sm sm:text-base"
              />
            </div>

            {/* Input 3: Organization / Hospital / Pharmacy */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <BuildingOffice2Icon className="w-4 h-4 text-indigo-600" />
                Organization / Institution / Hospital
              </label>
              <input
                type="text"
                value={formData.organization}
                onChange={(e) => handleInputChange("organization", e.target.value)}
                placeholder="e.g. Hiranis Pharmaceuticals (Pvt) Ltd"
                maxLength={65}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-medium text-sm sm:text-base"
              />
            </div>

            {/* Input 4: Message */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <ChatBubbleBottomCenterTextIcon className="w-4 h-4 text-rose-500" />
                Message
              </label>
              <select
                value={messageChoice}
                onChange={(e) => handleMessageChoiceChange(e.target.value)}
                title={messageChoice === CUSTOM_MESSAGE_OPTION ? undefined : formData.message}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-medium text-sm sm:text-base bg-white"
              >
                {PRESET_MESSAGES.map((msg, idx) => (
                  <option key={idx} value={String(idx)}>
                    {idx + 1}. {msg}
                  </option>
                ))}
                <option value={CUSTOM_MESSAGE_OPTION}>✍️ Write your own message…</option>
              </select>

              {messageChoice === CUSTOM_MESSAGE_OPTION ? (
                <textarea
                  value={customMessage}
                  onChange={(e) => handleCustomMessageChange(e.target.value)}
                  placeholder="Write your custom World Mental Health Day 2026 message..."
                  maxLength={220}
                  rows={3}
                  className="w-full mt-2 px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-medium text-sm sm:text-base resize-none"
                />
              ) : (
                <p className="text-xs text-slate-500 mt-2 italic leading-relaxed">
                  "{formData.message}"
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <motion.button
              onClick={handleDownload}
              disabled={isDownloading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2.5 text-base transition-all disabled:opacity-50"
            >
              <ArrowDownTrayIcon className="w-5 h-5 stroke-[2.5]" />
              <span>{isDownloading ? "Generating Banner..." : "Download High-Res Banner"}</span>
            </motion.button>

            <button
              type="button"
              onClick={handleReset}
              className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
            >
              Reset Form
            </button>
          </div>

          {/* Cloudinary Result Box */}
          {cloudinaryUrl && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2"
            >
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CloudArrowUpIcon className="w-5 h-5 text-emerald-600" />
                <span>Saved to Cloudinary!</span>
              </div>
              <p className="text-xs text-emerald-700">
                Your banner is backed up on cloud storage in high definition.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value={cloudinaryUrl}
                  className="flex-1 bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 truncate select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors flex-shrink-0"
                >
                  {isCopied ? (
                    <>
                      <ClipboardDocumentCheckIcon className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentIcon className="w-4 h-4" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Right Column: Live Interactive Canvas Preview */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="lg:col-span-7 flex flex-col items-center"
        >
          <div className="w-full sticky top-6">
            <div className="bg-slate-900/90 backdrop-blur-md rounded-3xl p-4 sm:p-6 shadow-2xl border border-slate-800">
              <div className="flex items-center justify-between pb-4 mb-3 border-b border-slate-800 text-white">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="font-bold text-sm sm:text-base">Live Banner Preview</h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="bg-slate-800 px-2.5 py-1 rounded-full font-mono text-[11px]">
                    1754 × 1240 px
                  </span>
                  <span className="hidden sm:inline-block">Landscape</span>
                </div>
              </div>

              {/* Canvas Container */}
              <div className="relative w-full aspect-[1754/1240] bg-slate-950 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border border-slate-800">
                <canvas
                  ref={canvasRef}
                  width={1754}
                  height={1240}
                  className="w-full h-full object-contain block select-none"
                />
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <p>💡 Live auto-updates as you type and crop</p>
                <p className="text-emerald-400 font-medium">Courtesy by Hiranis Pharmaceuticals (Pvt) Ltd</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PosterBuilder;
