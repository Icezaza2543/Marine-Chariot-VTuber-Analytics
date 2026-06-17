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
            โค้ดของแดชบอร์ดเผยแพร่ภายใต้ MIT License แต่สิทธิ์ดังกล่าวครอบคลุมเฉพาะซอฟต์แวร์ของโปรเจกต์นี้
            ไม่ครอบคลุมข้อมูลช่อง แบรนด์ ชื่อ ภาพลักษณ์ วิดีโอ thumbnail โพสต์ หรือสื่อใด ๆ ของ Marine Chariot
          </p>
          <p>
            แม้ข้อมูลบางส่วนจะมาจาก public web หรือ Google Sheet ที่เปิดเผยต่อสาธารณะ
            เจ้าของข้อมูลและคอนเทนต์ยังคงเป็นคุณ Marine Chariot และผู้ถือลิขสิทธิ์ที่เกี่ยวข้อง
            ไม่ควรนำข้อมูลไปใช้ซ้ำ เผยแพร่ต่อ ขาย ดัดแปลง หรือแสดงว่าเป็นงานอย่างเป็นทางการโดยไม่ได้รับอนุญาต
          </p>
          <p>
            ตัวเลขในแดชบอร์ดมาจาก Google Sheet CSV ที่รีเฟรชเป็นระยะ และ cache ของ X
            อาจไม่ตรงกับแพลตฟอร์มแบบเรียลไทม์ 100% ยอดซับและข้อมูลช่องทางอื่นเป็น snapshot ที่อัปเดตเป็นระยะ
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
