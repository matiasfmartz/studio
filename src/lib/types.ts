
import { z } from 'zod';

export const MemberRoleEnum = z.enum(['Leader', 'Worker', 'GeneralAttendee']);
export type MemberRoleType = z.infer<typeof MemberRoleEnum>;

export interface Member {
  id: string;
  firstName: string;
  lastName:string;
  email: string;
  phone: string;
  birthDate?: string; // YYYY-MM-DD
  churchJoinDate?: string; // YYYY-MM-DD
  baptismDate?: string; // User input, e.g., "June 2023" or "2023-06-15"
  attendsLifeSchool?: boolean;
  attendsBibleInstitute?: boolean;
  fromAnotherChurch?: boolean;
  assignedGDIId?: string | null; // ID of the GDI the member attends
  assignedAreaIds?: string[]; // IDs of MinistryAreas the member is part of
  status: 'Active' | 'Inactive' | 'New';
  avatarUrl?: string;
  roles?: MemberRoleType[];
}

export type MemberWriteData = Omit<Member, 'id'>;


export interface MinistryArea {
  id: string;
  name: string;
  description: string;
  leaderId: string; // Member ID of the leader
  memberIds: string[];
  imageUrl?: string;
}

export type MinistryAreaWriteData = Omit<MinistryArea, 'id'>;


export interface GDI { // Grupo de Integración
  id: string;
  name: string;
  guideId: string; // Member ID of the guide
  memberIds: string[];
}

export type GDIWriteData = Omit<GDI, 'id'>;

// For Meeting Series target roles
export const MeetingTargetRoleEnum = z.enum(["allMembers", "workers", "leaders"]); // Changed "generalAttendees" to "allMembers"
export type MeetingTargetRoleType = z.infer<typeof MeetingTargetRoleEnum>;

export const DayOfWeekEnum = z.enum(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
export type DayOfWeekType = z.infer<typeof DayOfWeekEnum>;

export const WeekOrdinalEnum = z.enum(['First', 'Second', 'Third', 'Fourth', 'Last']);
export type WeekOrdinalType = z.infer<typeof WeekOrdinalEnum>;

export const MonthlyRuleTypeEnum = z.enum(['DayOfMonth', 'DayOfWeekOfMonth']);
export type MonthlyRuleType = z.infer<typeof MonthlyRuleTypeEnum>;

export const MeetingFrequencyEnum = z.enum(["OneTime", "Weekly", "Monthly"]);
export type MeetingFrequencyType = z.infer<typeof MeetingFrequencyEnum>;

export interface MeetingSeries {
  id: string;
  name: string;
  description?: string;
  defaultTime: string; // HH:MM
  defaultLocation: string;
  defaultImageUrl?: string;
  targetAttendeeGroups: MeetingTargetRoleType[];
  frequency: MeetingFrequencyType;
  oneTimeDate?: string; // YYYY-MM-DD, only if frequency is "OneTime"

  // Weekly recurrence
  weeklyDays?: DayOfWeekType[];

  // Monthly recurrence
  monthlyRuleType?: MonthlyRuleType;
  monthlyDayOfMonth?: number; // 1-31
  monthlyWeekOrdinal?: WeekOrdinalType;
  monthlyDayOfWeek?: DayOfWeekType;
}
export type MeetingSeriesWriteData = Omit<MeetingSeries, 'id'>;

export interface Meeting {
  id: string;
  seriesId: string;
  name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  location: string;
  description?: string;
  imageUrl?: string;
  attendeeUids: string[];
  minute?: string | null;
}
export type MeetingWriteData = Omit<Meeting, 'id' | 'attendeeUids'> & { attendeeUids?: string[] };
export type MeetingInstanceUpdateData = Partial<Omit<Meeting, 'id' | 'seriesId' | 'attendeeUids'>>;


export interface AttendanceRecord {
  id: string;
  meetingId: string;
  memberId: string;
  attended: boolean;
  notes?: string;
}
export type AttendanceRecordWriteData = Omit<AttendanceRecord, 'id'>;


export interface Resource {
  id: string;
  title: string;
  type: 'Article' | 'Devotional' | 'Announcement' | 'Sermon Notes';
  snippet: string;
  imageUrl?: string;
  link?: string;
}

// Zod Schemas for Forms

export const MemberStatusSchema = z.enum(['Active', 'Inactive', 'New']);
export const NONE_GDI_OPTION_VALUE = "__NONE__";

export const AddMemberFormSchema = z.object({
  firstName: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  lastName: z.string().min(2, { message: "El apellido debe tener al menos 2 caracteres." }),
  email: z.string().email({ message: "Dirección de email inválida." }),
  phone: z.string().min(7, { message: "El número de teléfono parece demasiado corto." }),
  birthDate: z.date().optional(),
  churchJoinDate: z.date().optional(),
  baptismDate: z.string().optional(),
  attendsLifeSchool: z.boolean().default(false),
  attendsBibleInstitute: z.boolean().default(false),
  fromAnotherChurch: z.boolean().default(false),
  status: MemberStatusSchema,
  avatarUrl: z.string().url({ message: "URL inválida." }).optional().or(z.literal('')),
  assignedGDIId: z.string().nullable().optional(),
  assignedAreaIds: z.array(z.string()).optional(),
});
export type AddMemberFormValues = z.infer<typeof AddMemberFormSchema>;


export const AddMinistryAreaFormSchema = z.object({
  name: z.string().min(3, { message: "Area name must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  imageUrl: z.string().url({ message: "Invalid URL for image." }).optional().or(z.literal('')),
  leaderId: z.string().min(1, { message: "A leader must be selected." }),
});
export type AddMinistryAreaFormValues = z.infer<typeof AddMinistryAreaFormSchema>;

export const AddGdiFormSchema = z.object({
  name: z.string().min(3, { message: "GDI name must be at least 3 characters." }),
  guideId: z.string().min(1, { message: "A guide must be selected." }),
});
export type AddGdiFormValues = z.infer<typeof AddGdiFormSchema>;


export const DefineMeetingSeriesFormSchema = z.object({
  name: z.string().min(3, { message: "El nombre de la serie debe tener al menos 3 caracteres." }),
  description: z.string().optional(),
  defaultTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Formato de hora inválido (HH:MM)." }),
  defaultLocation: z.string().min(3, { message: "La ubicación por defecto es requerida." }),
  defaultImageUrl: z.string().url({ message: "URL de imagen inválida." }).optional().or(z.literal('')),
  targetAttendeeGroups: z.array(MeetingTargetRoleEnum).min(1,{message: "Debe seleccionar al menos un grupo de asistentes."}),
  frequency: MeetingFrequencyEnum,
  oneTimeDate: z.date().optional(),
  weeklyDays: z.array(DayOfWeekEnum).optional(),
  monthlyRuleType: MonthlyRuleTypeEnum.optional(),
  monthlyDayOfMonth: z.coerce.number().min(1).max(31).optional(),
  monthlyWeekOrdinal: WeekOrdinalEnum.optional(),
  monthlyDayOfWeek: DayOfWeekEnum.optional(),
}).superRefine((data, ctx) => {
  if (data.frequency === "OneTime") {
    if (!data.oneTimeDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La fecha es requerida para reuniones de 'Única Vez'.",
        path: ["oneTimeDate"],
      });
    }
  }
  if (data.frequency === 'Weekly') {
    if (!data.weeklyDays || data.weeklyDays.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe seleccionar al menos un día para la frecuencia semanal.",
        path: ['weeklyDays'],
      });
    }
  }
  if (data.frequency === 'Monthly') {
    if (!data.monthlyRuleType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Debe seleccionar un tipo de regla mensual.", path: ['monthlyRuleType'] });
    } else if (data.monthlyRuleType === 'DayOfMonth') {
      if (data.monthlyDayOfMonth === undefined || data.monthlyDayOfMonth < 1 || data.monthlyDayOfMonth > 31) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El día del mes debe estar entre 1 y 31.", path: ['monthlyDayOfMonth'] });
      }
    } else if (data.monthlyRuleType === 'DayOfWeekOfMonth') {
      if (!data.monthlyWeekOrdinal) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Debe seleccionar la semana ordinal (ej. Primera, Última).", path: ['monthlyWeekOrdinal'] });
      }
      if (!data.monthlyDayOfWeek) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Debe seleccionar el día de la semana (ej. Lunes, Martes).", path: ['monthlyDayOfWeek'] });
      }
    }
  }
});
export type DefineMeetingSeriesFormValues = z.infer<typeof DefineMeetingSeriesFormSchema>;

export const MeetingInstanceFormSchema = z.object({ // Renamed from AddOccasionalMeetingFormSchema for broader use
  name: z.string().min(3, { message: "El nombre de la reunión debe tener al menos 3 caracteres." }),
  date: z.date({ required_error: "La fecha es requerida." }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Formato de hora inválido (HH:MM)." }),
  location: z.string().min(3, { message: "La ubicación es requerida." }),
  description: z.string().optional(),
  imageUrl: z.string().url({ message: "URL de imagen inválida." }).optional().or(z.literal('')),
});
export type MeetingInstanceFormValues = z.infer<typeof MeetingInstanceFormSchema>; // Renamed type


export const daysOfWeek: { id: DayOfWeekType; label: string }[] = [
    { id: "Sunday", label: "Domingo" },
    { id: "Monday", label: "Lunes" },
    { id: "Tuesday", label: "Martes" },
    { id: "Wednesday", label: "Miércoles" },
    { id: "Thursday", label: "Jueves" },
    { id: "Friday", label: "Viernes" },
    { id: "Saturday", label: "Sábado" },
];

export const weekOrdinals: { id: WeekOrdinalType; label: string }[] = [
    { id: "First", label: "Primera" },
    { id: "Second", label: "Segunda" },
    { id: "Third", label: "Tercera" },
    { id: "Fourth", label: "Cuarta" },
    { id: "Last", label: "Última" },
];

// Ensure AddOccasionalMeetingFormValues is still exported if used elsewhere for specifically adding occasional meetings
export type AddOccasionalMeetingFormValues = MeetingInstanceFormValues;
export const AddOccasionalMeetingFormSchema = MeetingInstanceFormSchema;

