import { expect, test } from "vitest";
import Popup from "./Popup";
import { render } from "@solidjs/testing-library";

test("Popup", () => {
  const { getByText } = render(() => <Popup />);
  const link = getByText("Learn Solid");

  expect(link).toBeDefined();
  expect(link).toHaveAttribute("href", "https://github.com/solidjs/solid");
});
