import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

interface DisclaimerDialogProps {
  open: boolean
  onClose: () => void
}

export function DisclaimerDialog({ open, onClose }: DisclaimerDialogProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current

    if (!dialog) {
      return
    }

    if (open && !dialog.open) {
      dialog.showModal()
      return
    }

    if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      className="disclaimer-dialog"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          onClose()
        }
      }}
      ref={dialogRef}
    >
      <article className="disclaimer-dialog__panel">
        <header className="disclaimer-dialog__header">
          <h2 id={titleId}>ข้อจำกัดความรับผิดชอบ</h2>
          <button aria-label="ปิด" className="icon-btn" onClick={onClose} type="button">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="disclaimer-dialog__body">
          <p>
            Marine Chariot Analytics เป็นโปรเจกต์ fan-made ที่จัดทำเพื่อวิเคราะห์ข้อมูลสาธารณะจาก YouTube export
            และ X API ไม่ได้ดำเนินการโดยหรือในนามของ Marine Chariot อย่างเป็นทางการ
          </p>
          <p>
            ชื่อ แบรนด์ และเนื้อหาของ VTuber เป็นของเจ้าของช่องตามลำดับ โปรเจกต์นี้ใช้เพื่อการวิเคราะห์และศึกษาเท่านั้น
          </p>
          <p>
            ตัวเลขในแดชบอร์ดมาจากไฟล์ CSV และ cache ของ X อาจไม่ตรงกับแพลตฟอร์มแบบเรียลไทม์ 100%
            ยอดซับและข้อมูลช่องทางอื่นเป็น snapshot ที่อัปเดตเป็นระยะ
          </p>
          <p>
            Insight และการพยากรณ์เป็นการตีความจากข้อมูลในอดีต ไม่ใช่คำแนะนำทางธุรกิจหรือการลงทุน
          </p>
        </div>

        <footer className="disclaimer-dialog__footer">
          <button className="disclaimer-dialog__close-btn" onClick={onClose} type="button">
            เข้าใจแล้ว
          </button>
        </footer>
      </article>
    </dialog>
  )
}