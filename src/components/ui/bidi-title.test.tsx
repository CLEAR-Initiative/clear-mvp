import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BidiTitle } from "./bidi-title";

describe("BidiTitle", () => {
  it("isolates a title that mixes English and Arabic, whatever the page's direction", () => {
    const title = "Explosions in Al-Kanabi (الكنابي), Northern";
    render(
      <div dir="rtl">
        <h1>
          <BidiTitle>{title}</BidiTitle>
        </h1>
      </div>,
    );
    const el = screen.getByText(title);
    // <bdi> takes its direction from the text itself (dir=auto by default).
    expect(el.tagName).toBe("BDI");
    expect(el).not.toHaveAttribute("dir");
    // The stored text is shown as it is: no direction marks are added.
    expect(el.textContent).toBe(title);
  });
});
