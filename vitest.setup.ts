import "@testing-library/jest-dom/vitest";

const RealDate = global.Date;
const mockTime = new RealDate("2026-05-10T00:00:00.000Z").getTime();

function DateMock(...args: unknown[]) {
  if (!new.target) {
    return new RealDate(mockTime).toString();
  }
  if (args.length === 0 || args[0] === undefined) {
    return new RealDate(mockTime);
  }
  // @ts-expect-error Native Date constructor takes arguments dynamically
  return new RealDate(...args);
}

// Inherit prototype
DateMock.prototype = RealDate.prototype;

// Copy static methods and properties
DateMock.now = () => mockTime;

Object.getOwnPropertyNames(RealDate).forEach((prop) => {
  if (prop !== "now" && prop !== "length" && prop !== "name" && prop !== "prototype") {
    // @ts-expect-error Copying static methods
    (DateMock as Record<string, unknown>)[prop] = (RealDate as Record<string, unknown>)[prop];
  }
});

global.Date = DateMock as unknown as typeof RealDate;
