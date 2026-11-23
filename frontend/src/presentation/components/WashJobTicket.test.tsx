import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WashJob } from "@/domain/entities/wash-job.entity";
import { WashJobTicket } from "./WashJobTicket";

const job: WashJob = {
  id: "job-id",
  user_id: "user-id",
  created_by_user_id: "user-id",
  business_id: "business-id",
  washer_id: null,
  car_type: "Automóvil",
  wash_type: "Lavada General",
  washer_name: "Sin asignar",
  license_plate: "ABC123",
  price: 18000,
  status: "pending",
  created_at: "2026-11-20T15:00:00.000Z",
  updated_at: "2026-11-20T15:00:00.000Z",
  addons: [
    {
      id: "job-addon-id",
      wash_job_id: "job-id",
      addon_id: "addon-id",
      addon_name_snapshot: "Cera líquida",
      price_snapshot: 3000,
    },
  ],
};

describe("WashJobTicket", () => {
  it("shows persisted business, vehicle, itemized prices, total and status", () => {
    render(
      <WashJobTicket
        businessName="Autolavado Express El Chorro"
        job={job}
        onNewScan={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Autolavado Express El Chorro")).toBeInTheDocument();
    expect(screen.getByText("ABC123")).toBeInTheDocument();
    expect(screen.getByText("Automóvil")).toBeInTheDocument();
    expect(screen.getByText("Lavada General")).toBeInTheDocument();
    expect(screen.getByText("Cera líquida")).toBeInTheDocument();
    expect(screen.getByText("$15.000")).toBeInTheDocument();
    expect(screen.getByText("$3.000")).toBeInTheDocument();
    expect(screen.getByText("$18.000")).toBeInTheDocument();
    expect(screen.getByText("Estado: Pendiente")).toBeInTheDocument();
  });

  it("offers a new scan and close actions", () => {
    const onNewScan = vi.fn();
    const onClose = vi.fn();
    render(
      <WashJobTicket
        businessName="Autolavado Express El Chorro"
        job={job}
        onNewScan={onNewScan}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Nuevo escaneo" }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(onNewScan).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
