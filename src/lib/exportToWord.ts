import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
} from 'docx'
import { saveAs } from 'file-saver'
import type { GroupedTasks, GroupBy } from '@/lib/taskGrouping'
import { formatPrintDeadline, getPriorityMarker } from '@/lib/taskGrouping'
import type { TFunction } from 'i18next'
import { sanitizeHexColorBare } from '@/lib/sanitize'

interface ExportOptions {
  groupedTasks: GroupedTasks[]
  groupBy: GroupBy
  locale: string
  t: TFunction
  getColumnName: (columnId: string) => string
  getSubjectName: (subjectId: string | null) => string | null
}

export async function exportToWord({
  groupedTasks,
  groupBy,
  locale,
  t,
  getColumnName,
  getSubjectName,
}: ExportOptions): Promise<void> {
  const currentDate = new Date().toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const children: Paragraph[] = []

  // Title
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: t('print.myTasks'),
          bold: true,
          size: 40,
          font: 'Calibri',
        }),
      ],
    })
  )

  // Date
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: currentDate,
          size: 22,
          color: '555555',
          font: 'Calibri',
        }),
      ],
    })
  )

  // Grouped sections
  for (const group of groupedTasks) {
    const borderColor = sanitizeHexColorBare(group.color, '333333')
    const labelColor = sanitizeHexColorBare(group.color, '000000')

    // Section header
    children.push(
      new Paragraph({
        spacing: { before: 300, after: 200 },
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 3,
            color: borderColor,
          },
        },
        children: [
          new TextRun({
            text: group.label,
            bold: true,
            size: 28,
            color: labelColor,
            font: 'Calibri',
          }),
          new TextRun({
            text: ` (${group.tasks.length})`,
            size: 22,
            color: '666666',
            font: 'Calibri',
          }),
        ],
      })
    )

    // Tasks
    for (const task of group.tasks) {
      const priorityMarker = getPriorityMarker(task.priority)
      const subjectName = groupBy !== 'subject' ? getSubjectName(task.subjectId) : null
      const columnName = groupBy !== 'column' ? getColumnName(task.columnId) : null
      const deadline = groupBy !== 'deadline' ? formatPrintDeadline(task.deadline, t, locale) : null

      let meta = ''
      if (subjectName) meta += `[${subjectName}] `
      if (columnName) meta += `[${columnName}] `
      if (deadline) meta += `\u2014 ${deadline}`

      const taskChildren: TextRun[] = [
        new TextRun({
          text: '\u2610 ',
          size: 24,
          font: 'Segoe UI Symbol',
        }),
      ]

      if (priorityMarker) {
        taskChildren.push(
          new TextRun({
            text: priorityMarker + ' ',
            bold: true,
            color: 'DC2626',
            size: 24,
            font: 'Calibri',
          })
        )
      }

      taskChildren.push(
        new TextRun({
          text: task.title,
          size: 24,
          font: 'Calibri',
        })
      )

      if (meta) {
        taskChildren.push(
          new TextRun({
            text: '  ' + meta,
            size: 20,
            color: '666666',
            font: 'Calibri',
          })
        )
      }

      children.push(
        new Paragraph({
          spacing: { before: 80, after: task.description ? 0 : 80 },
          indent: { left: 360 },
          children: taskChildren,
        })
      )

      // Description
      if (task.description) {
        children.push(
          new Paragraph({
            spacing: { after: 80 },
            indent: { left: 720 },
            children: [
              new TextRun({
                text: task.description,
                size: 18,
                color: '555555',
                italics: true,
                font: 'Calibri',
              }),
            ],
          })
        )
      }
    }
  }

  // Notes section
  children.push(
    new Paragraph({
      spacing: { before: 600, after: 200 },
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 3,
          color: '333333',
        },
      },
      children: [
        new TextRun({
          text: t('export.notesSection'),
          bold: true,
          size: 28,
          font: 'Calibri',
        }),
      ],
    })
  )

  for (let i = 0; i < 10; i++) {
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: '', size: 24 })],
      })
    )
  }

  const doc = new Document({
    creator: 'StudyFlow',
    title: t('print.myTasks'),
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134,
              right: 1134,
              bottom: 1134,
              left: 1134,
            },
          },
        },
        children,
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const filename = `${t('print.myTasks')} \u2014 ${currentDate}.docx`
  saveAs(blob, filename)
}
