export function getStatusVariant(
  status: string
): "default" | "secondary" | "success" | "warning" | "information" {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "SCHEDULED":
      return "warning";
    case "CLOSED":
      return "secondary";
    case "ARCHIVED":
      return "secondary";
    default:
      return "secondary";
  }
}
