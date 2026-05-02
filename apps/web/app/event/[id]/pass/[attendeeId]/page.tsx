"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api, type Id } from "@invyte/convex";
import { jsPDF } from "jspdf";
import { QRCodeCanvas } from "qrcode.react";
import { downloadIcsFile } from "@/lib/calendar";

export default function EntryPassPage() {
  const params = useParams<{ id: Id<"events">; attendeeId: Id<"attendees"> }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qrWrapperRef = useRef<HTMLDivElement>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const accessToken = searchParams.get("access");
  const pass = useQuery(api.events.getAttendeePass, {
    eventId: params.id,
    attendeeId: params.attendeeId,
    accessToken: accessToken ?? undefined,
  });

  if (pass === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (pass === null) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <p className="text-on-surface-variant mb-4">Pass not found.</p>
      </div>
    );
  }

  const statusLabel =
    pass.attendee.rsvpStatus === "going"
      ? "Confirmed"
      : pass.attendee.rsvpStatus === "maybe"
        ? "Maybe"
        : "Not Going";
  const passPath = `/event/${pass.event._id}/pass/${pass.attendee._id}`;
  const signedPassPath = `${passPath}?access=${encodeURIComponent(
    pass.eventAccessToken,
  )}`;
  const passUrl =
    typeof window === "undefined"
      ? signedPassPath
      : `${window.location.origin}${signedPassPath}`;
  const signedEventPath = `/event/${pass.event._id}/details?access=${encodeURIComponent(
    pass.eventAccessToken,
  )}`;
  const qrPayload = JSON.stringify({
    url: passUrl,
    code: pass.qrValue,
  });

  const handleDownloadPdf = () => {
    const qrCanvas = qrWrapperRef.current?.querySelector("canvas");
    if (!qrCanvas || isDownloadingPdf) {
      return;
    }

    setIsDownloadingPdf(true);
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 40;
      const cardWidth = pageWidth - margin * 2;

      pdf.setFillColor(18, 18, 24);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      pdf.setFillColor(34, 32, 44);
      pdf.roundedRect(margin, 44, cardWidth, pageHeight - 88, 24, 24, "F");
      pdf.setDrawColor(189, 126, 255);
      pdf.setLineWidth(1);
      pdf.roundedRect(margin, 44, cardWidth, pageHeight - 88, 24, 24, "S");

      pdf.setTextColor(189, 126, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text("INVYTE EVENT PASS", margin + 24, 82);

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.text(pass.event.title, margin + 24, 118, {
        maxWidth: cardWidth - 48,
      });

      pdf.setFontSize(11);
      pdf.setTextColor(191, 191, 204);
      const detailsTop = 158;
      pdf.text(`Guest: ${pass.attendee.name}`, margin + 24, detailsTop);
      pdf.text(`Status: ${statusLabel}`, margin + 24, detailsTop + 22);
      pdf.text(`Date: ${pass.event.date}`, margin + 24, detailsTop + 44);
      pdf.text(`Time: ${pass.event.time}`, margin + 24, detailsTop + 66);
      pdf.text(
        `Location: ${pass.event.location}`,
        margin + 24,
        detailsTop + 88,
        {
          maxWidth: cardWidth - 240,
        },
      );
      pdf.text(`Host: ${pass.event.hostName}`, margin + 24, detailsTop + 128);

      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(pageWidth - margin - 180, 150, 140, 140, 20, 20, "F");
      pdf.addImage(
        qrCanvas.toDataURL("image/png"),
        "PNG",
        pageWidth - margin - 162,
        168,
        104,
        104,
      );

      pdf.setDrawColor(90, 90, 106);
      pdf.setLineDashPattern([5, 5], 0);
      pdf.line(margin + 24, 332, pageWidth - margin - 24, 332);
      pdf.setLineDashPattern([], 0);

      pdf.setFontSize(10);
      pdf.setTextColor(191, 191, 204);
      const notes = pdf.splitTextToSize(
        `Open pass: ${passUrl}\nEvent details: ${
          typeof window === "undefined"
            ? signedEventPath
            : `${window.location.origin}${signedEventPath}`
        }`,
        cardWidth - 48,
      );
      pdf.text(notes, margin + 24, 362);

      const fileName = `${pass.event.title}-${pass.attendee.name}-pass`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      pdf.save(`${fileName || "event-pass"}.pdf`);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleAddToCalendar = () => {
    const eventUrl =
      typeof window === "undefined"
        ? signedEventPath
        : `${window.location.origin}${signedEventPath}`;
    downloadIcsFile({
      id: pass.event._id,
      title: pass.event.title,
      date: pass.event.date,
      time: pass.event.time,
      location: pass.event.location,
      url: eventUrl,
    });
  };

  const handleSendPassEmail = () => {
    if (!pass.attendee.email) {
      return;
    }

    const params = new URLSearchParams({
      cc: pass.event.hostEmail ?? "",
      subject: `Your pass for ${pass.event.title}`,
      body: [
        `Hi ${pass.attendee.name},`,
        "",
        `Here is your event pass for ${pass.event.title}.`,
        `Date: ${pass.event.date}`,
        `Time: ${pass.event.time}`,
        `Location: ${pass.event.location}`,
        "",
        `Open pass: ${passUrl}`,
        `Event details: ${
          typeof window === "undefined"
            ? signedEventPath
            : `${window.location.origin}${signedEventPath}`
        }`,
      ].join("\n"),
    });

    window.location.href = `mailto:${pass.attendee.email}?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="glass-card rounded-3xl border border-primary/20 overflow-hidden shadow-glow-purple">
          <div className="relative h-40 overflow-hidden">
            <Image
              alt={pass.event.title}
              className="object-cover"
              fill
              src={pass.event.coverImage}
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(37,37,44,0.6)] to-transparent" />
            <div className="absolute top-4 left-4">
              <span className="font-headline font-black tracking-tighter uppercase text-xl italic gradient-text">
                Invyte
              </span>
            </div>
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 rounded-full bg-primary/30 text-primary text-[9px] font-black uppercase tracking-wider backdrop-blur-sm border border-primary/20">
                {statusLabel}
              </span>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <span className="text-[10px] font-label font-bold uppercase tracking-[0.2em] text-secondary">
                Event Pass
              </span>
              <h1 className="font-headline text-2xl font-black tracking-tight mt-1">
                {pass.event.title}
              </h1>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[9px] font-label font-bold uppercase tracking-widest text-on-surface-variant">
                  Date
                </span>
                <p className="text-sm font-medium">{pass.event.date}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-label font-bold uppercase tracking-widest text-on-surface-variant">
                  Time
                </span>
                <p className="text-sm font-medium">{pass.event.time}</p>
              </div>
              <div className="space-y-1 col-span-2">
                <span className="text-[9px] font-label font-bold uppercase tracking-widest text-on-surface-variant">
                  Location
                </span>
                <p className="text-sm font-medium">{pass.event.location}</p>
              </div>
            </div>
            <div className="relative flex items-center">
              <div className="absolute -left-10 w-6 h-6 rounded-full bg-background" />
              <div className="flex-1 border-t border-dashed border-outline-variant/30" />
              <div className="absolute -right-10 w-6 h-6 rounded-full bg-background" />
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden">
                <Image
                  alt={pass.attendee.name}
                  className="object-cover"
                  fill
                  src={pass.attendee.avatar}
                  unoptimized
                />
              </div>
              <div>
                <p className="font-medium text-sm">{pass.attendee.name}</p>
                <p className="text-xs text-on-surface-variant">
                  {pass.attendee.plusOne && pass.attendee.plusOneName
                    ? `+1 confirmed with ${pass.attendee.plusOneName}`
                    : "Solo RSVP"}
                </p>
              </div>
            </div>
            <div className="flex justify-center py-4">
              <div
                ref={qrWrapperRef}
                className="w-40 h-40 rounded-2xl bg-white flex items-center justify-center"
              >
                <QRCodeCanvas
                  value={qrPayload}
                  size={124}
                  level="M"
                  includeMargin
                  bgColor="#FFFFFF"
                  fgColor="#111111"
                />
              </div>
            </div>
            <div className="text-sm text-on-surface-variant">
              Host:{" "}
              <span className="text-on-surface font-medium">
                {pass.event.hostName}
              </span>
            </div>
          </div>
        </div>
        <p className="text-center text-[10px] text-outline uppercase tracking-widest mt-6">
          Show this pass at the door
        </p>
        <button
          className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
          onClick={handleAddToCalendar}
          type="button"
        >
          <span className="material-symbols-outlined text-base">
            calendar_add_on
          </span>
          Add to Calendar
        </button>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <button
            className="btn-secondary"
            onClick={handleDownloadPdf}
            type="button"
          >
            {isDownloadingPdf ? "Preparing PDF" : "Download PDF"}
          </button>
          <button
            className="btn-secondary disabled:opacity-50"
            disabled={!pass.attendee.email}
            onClick={handleSendPassEmail}
            type="button"
          >
            Send Pass Email
          </button>
        </div>
        <button
          className="btn-secondary w-full mt-3"
          onClick={() => router.push(signedEventPath)}
          type="button"
        >
          Go To Event Details
        </button>
      </div>
    </div>
  );
}
