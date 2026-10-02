import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { VoiceNote, voiceMimeType } from "./voice-note";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
}));

let resolveInvalidate: () => void = () => undefined;
const invalidate = vi.fn(
  () =>
    new Promise<void>((resolve) => {
      resolveInvalidate = resolve;
    }),
);
vi.mock("~/trpc/react", () => ({
  api: { useUtils: () => ({ ground: { hotlineInbox: { invalidate } } }) },
}));

/** jsdom's canPlayType always answers "" (no media stack); stub a browser. */
let playable: CanPlayTypeResult = "maybe";
const canPlayType = vi.fn((_type: string): CanPlayTypeResult => playable);
beforeEach(() => {
  playable = "maybe";
  vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockImplementation(canPlayType);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

const URL_1 = "https://s3/hotline/abc/voice.ogg?X-Amz-Signature=one";
const URL_2 = "https://s3/hotline/abc/voice.ogg?X-Amz-Signature=two";

describe("voiceMimeType", () => {
  it("maps voice extensions to probe types, ignoring the presign query", () => {
    expect(voiceMimeType(URL_1)).toBe('audio/ogg; codecs="opus"');
    expect(voiceMimeType("https://s3/a.OPUS")).toBe('audio/ogg; codecs="opus"');
    expect(voiceMimeType("https://s3/a.mp3?x=1.wav")).toBe("audio/mpeg");
    expect(voiceMimeType("https://s3/a.m4a")).toBe("audio/mp4");
    expect(voiceMimeType("https://s3/a.amr")).toBe("audio/amr");
    expect(voiceMimeType("https://s3/no-extension?sig=1")).toBeNull();
  });
});

describe("VoiceNote", () => {
  it("renders a labelled inline player that fetches nothing until played, plus the open link", () => {
    render(<VoiceNote url={URL_1} label="Voice note 2" />);
    const player = screen.getByLabelText("Voice note 2");
    expect(player.tagName).toBe("AUDIO");
    expect(player).toHaveAttribute("controls");
    expect(player).toHaveAttribute("preload", "none");
    expect(player).toHaveAttribute("src", URL_1);
    expect(canPlayType).toHaveBeenCalledWith('audio/ogg; codecs="opus"');
    const open = screen.getByTestId("inbox-voice-open");
    expect(open).toHaveAttribute("href", URL_1);
    expect(open).toHaveAttribute("target", "_blank");
    expect(screen.getByTestId("inbox-voice-note")).toHaveAttribute("data-status", "ready");
  });

  it("falls back to the link when the browser cannot play the format", () => {
    playable = "";
    render(<VoiceNote url={URL_1} label="Voice note 1" />);
    expect(screen.queryByTestId("inbox-voice-player")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("pane.voiceUnsupported");
    expect(screen.getByTestId("inbox-voice-open")).toHaveAttribute("href", URL_1);
  });

  it("still offers the player for an unknown extension", () => {
    playable = "";
    render(<VoiceNote url="https://s3/voice?sig=1" label="Voice note 1" />);
    expect(canPlayType).not.toHaveBeenCalled();
    expect(screen.getByTestId("inbox-voice-player")).toBeInTheDocument();
  });

  it("refreshes an expired link once on playback error, then gives up on a second error", async () => {
    const { rerender } = render(<VoiceNote url={URL_1} label="Voice note 1" />);

    fireEvent.error(screen.getByTestId("inbox-voice-player"));
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("inbox-voice-note")).toHaveAttribute("data-status", "refreshing");
    expect(screen.getByRole("status")).toHaveTextContent("pane.voiceRefreshing");

    // The refetch brings a freshly presigned URL for the same object.
    rerender(<VoiceNote url={URL_2} label="Voice note 1" />);
    await act(async () => resolveInvalidate());
    await waitFor(() => expect(screen.getByTestId("inbox-voice-note")).toHaveAttribute("data-status", "ready"));
    expect(screen.getByTestId("inbox-voice-player")).toHaveAttribute("src", URL_2);
    expect(screen.getByTestId("inbox-voice-open")).toHaveAttribute("href", URL_2);

    fireEvent.error(screen.getByTestId("inbox-voice-player"));
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("inbox-voice-player")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("pane.voiceFailed");
    expect(screen.getByTestId("inbox-voice-open")).toBeInTheDocument();
  });

  it("restores the refresh budget once playback succeeds, so a later expiry refreshes again", async () => {
    const { rerender } = render(<VoiceNote url={URL_1} label="Voice note 1" />);

    fireEvent.error(screen.getByTestId("inbox-voice-player"));
    rerender(<VoiceNote url={URL_2} label="Voice note 1" />);
    await act(async () => resolveInvalidate());
    await waitFor(() => expect(screen.getByTestId("inbox-voice-note")).toHaveAttribute("data-status", "ready"));

    // The refreshed link plays; an hour later it expires too.
    fireEvent.playing(screen.getByTestId("inbox-voice-player"));
    fireEvent.error(screen.getByTestId("inbox-voice-player"));
    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("inbox-voice-note")).toHaveAttribute("data-status", "refreshing");
  });

  it("tags a note whose transcription failed, with the error on the tooltip", () => {
    render(<VoiceNote url={URL_1} label="Voice note 1" transcriptionFailed={{ error: "unsupported codec" }} />);
    expect(screen.getByTestId("inbox-voice-note")).toHaveAttribute("data-transcription", "failed");
    const tag = screen.getByTestId("inbox-voice-transcription-failed");
    expect(tag).toHaveTextContent("pane.transcriptFailed");
    expect(tag).toHaveAttribute("title", "unsupported codec");
    // The audio itself is fine: the player stays.
    expect(screen.getByLabelText("Voice note 1").tagName).toBe("AUDIO");
  });

  it("has no failed tag while transcription is pending or done", () => {
    render(<VoiceNote url={URL_1} label="Voice note 1" />);
    expect(screen.queryByTestId("inbox-voice-transcription-failed")).not.toBeInTheDocument();
    expect(screen.getByTestId("inbox-voice-note")).not.toHaveAttribute("data-transcription");
  });
});
