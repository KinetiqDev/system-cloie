import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InstallAppButton } from "@/features/portals/components/install-app-button";

const { showToastMock } = vi.hoisted(() => ({ showToastMock: vi.fn() }));

vi.mock("@/components/ui/toast", () => ({ showToast: showToastMock }));

type InstallPromptEvent = Event & {
  prompt: ReturnType<typeof vi.fn>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches })));
}

function createInstallPromptEvent(outcome: "accepted" | "dismissed") {
  const event = new Event("beforeinstallprompt") as InstallPromptEvent;
  const prompt = vi.fn().mockResolvedValue(undefined);
  const preventDefault = vi.spyOn(event, "preventDefault");
  event.prompt = prompt;
  event.userChoice = Promise.resolve({ outcome });
  return { event, prompt, preventDefault };
}

function dispatch(event: Event) {
  act(() => {
    window.dispatchEvent(event);
  });
}

describe("InstallAppButton", () => {
  beforeEach(() => {
    stubMatchMedia(false);
    showToastMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders nothing before beforeinstallprompt fires", () => {
    render(<InstallAppButton />);
    expect(screen.queryByRole("button", { name: "Install System CLOIE app" })).not.toBeInTheDocument();
  });

  it("renders after beforeinstallprompt fires and suppresses the automatic prompt", () => {
    const { event, preventDefault } = createInstallPromptEvent("accepted");
    render(<InstallAppButton />);

    dispatch(event);

    expect(screen.getByRole("button", { name: "Install System CLOIE app" })).toBeInTheDocument();
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it("calls prompt() on the stashed event when clicked", () => {
    const { event, prompt } = createInstallPromptEvent("accepted");
    render(<InstallAppButton />);
    dispatch(event);

    fireEvent.click(screen.getByRole("button", { name: "Install System CLOIE app" }));

    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it("shows the confirmation toast and hides the button after an accepted install", async () => {
    const { event } = createInstallPromptEvent("accepted");
    render(<InstallAppButton />);
    dispatch(event);

    fireEvent.click(screen.getByRole("button", { name: "Install System CLOIE app" }));

    await waitFor(() => expect(showToastMock).toHaveBeenCalledWith("System CLOIE installed", "success"));
    expect(screen.queryByRole("button", { name: "Install System CLOIE app" })).not.toBeInTheDocument();
  });

  it("hides the button without a toast when the prompt is dismissed", async () => {
    const { event } = createInstallPromptEvent("dismissed");
    render(<InstallAppButton />);
    dispatch(event);

    fireEvent.click(screen.getByRole("button", { name: "Install System CLOIE app" }));

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Install System CLOIE app" })).not.toBeInTheDocument()
    );
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it("hides the button when appinstalled fires", () => {
    const { event } = createInstallPromptEvent("dismissed");
    render(<InstallAppButton />);
    dispatch(event);
    expect(screen.getByRole("button", { name: "Install System CLOIE app" })).toBeInTheDocument();

    dispatch(new Event("appinstalled"));

    expect(screen.queryByRole("button", { name: "Install System CLOIE app" })).not.toBeInTheDocument();
  });

  it("renders nothing in standalone display mode even after the event fires", () => {
    stubMatchMedia(true);
    const { event } = createInstallPromptEvent("accepted");
    render(<InstallAppButton />);

    dispatch(event);

    expect(screen.queryByRole("button", { name: "Install System CLOIE app" })).not.toBeInTheDocument();
  });
});