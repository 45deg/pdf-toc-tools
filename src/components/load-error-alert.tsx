import { usePdfStore } from "@/hooks/use-pdf-store"
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
 * PDF ファイル読み込みエラー時に表示されるアラートダイアログ。
 * loadErrors が空でないとき自動で開く。
 */
export function LoadErrorAlert() {
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
              ? "ファイルを読み込めませんでした"
              : `${loadErrors.length}件のファイルを読み込めませんでした`}
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
            閉じる
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
