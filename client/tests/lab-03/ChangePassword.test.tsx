import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthProvider } from "../../src/context/AuthContext.js";
import ChangePassword from "../../src/components/ChangePassword.js";
import * as api from "../../src/api.js";

function renderChangePassword() {
  return render(
    <AuthProvider>
      <ChangePassword />
    </AuthProvider>
  );
}

describe("ChangePassword", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("disables Continue until the policy is met and passwords match", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(null);
    renderChangePassword();
    const continueButton = await screen.findByRole("button", { name: /continue/i });
    expect(continueButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/current \(temporary\) password/i), { target: { value: "ChangeMe123" } });
    fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: "short" } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: "short" } });
    expect(continueButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: "NewPassword123" } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: "Mismatch123" } });
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(continueButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: "NewPassword123" } });
    expect(continueButton).not.toBeDisabled();
  });

  it("submits the new password and shows a safe error on failure", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(null);
    vi.spyOn(api, "changePassword").mockRejectedValue(new Error("Current password is incorrect."));
    renderChangePassword();
    const continueButton = await screen.findByRole("button", { name: /continue/i });

    fireEvent.change(screen.getByLabelText(/current \(temporary\) password/i), { target: { value: "WrongOne1" } });
    fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: "NewPassword123" } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: "NewPassword123" } });
    fireEvent.click(continueButton);

    await waitFor(() => expect(screen.getByText(/current password is incorrect/i)).toBeInTheDocument());
  });
});