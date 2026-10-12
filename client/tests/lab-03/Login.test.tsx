import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthProvider } from "../../src/context/AuthContext.js";
import Login from "../../src/components/Login.js";
import * as api from "../../src/api.js";

function renderLogin() {
  return render(
    <AuthProvider>
      <Login />
    </AuthProvider>
  );
}

describe("Login", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requires email and password before submitting", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(null);
    renderLogin();
    await waitFor(() => expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument());

    expect(screen.getByLabelText(/email address/i)).toBeRequired();
    expect(screen.getByLabelText(/^password$/i)).toBeRequired();
  });

  it("shows the generic error banner on invalid credentials", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(null);
    vi.spyOn(api, "login").mockRejectedValue(new Error("Invalid email or password"));
    renderLogin();
    await waitFor(() => expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "wrongpass1" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument());
  });

  it("logs in successfully with valid credentials", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(null);
    vi.spyOn(api, "login").mockResolvedValue({
      id: 1,
      name: "Jennifer Anderson",
      email: "jennifer.anderson@example.com",
      role: "REQUESTER",
      mustChangePassword: false,
    });
    renderLogin();
    await waitFor(() => expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "jennifer.anderson@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "ChangeMe123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(api.login).toHaveBeenCalledWith("jennifer.anderson@example.com", "ChangeMe123"));
  });
});