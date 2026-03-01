import { usePdfStore } from "@/hooks/use-pdf-store"
import { useTranslation } from "react-i18next"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { HugeiconsIcon } from "@hugeicons/react"
import { AlertCircleIcon } from "@hugeicons/core-free-icons"

/**
 * Alert dialog displayed when an error occurs during PDF file loading.
 * Automatically opens when loadErrors is not empty.
 */
export function LoadErrorAlert() {
  const { t } = useTranslation()
  const { state, actions } = usePdfStore()
  const { loadErrors } = state

  if (loadErrors.length === 0) return null

  return (
    <AlertDialog open onOpenChange={(open) => !open && actions.clearLoadErrors()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10">
            <HugeiconsIcon
              icon={AlertCircleIcon}
              strokeWidth={1.5}
              className="size-5 text-destructive"
            />
          </AlertDialogMedia>
          <AlertDialogTitle>
            {loadErrors.length === 1
              ? t("errors.loadFailed")
              : t("errors.loadFailedMany", { count: loadErrors.length })}
          </AlertDialogTitle>
          <AlertDialogDescription render={<div />}>
            <ul className="mt-1 space-y-1 text-left">
              {loadErrors.map((err, i) => (
                <li key={i}>
                  <span className="font-medium text-foreground">
                    {err.fileName}
                  </span>
                  <br />
                  <span className="text-muted-foreground text-xs">
                    {err.message}
                  </span>
                </li>
              ))}
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={() => actions.clearLoadErrors()}
          >
            {t("common.close")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
