export interface Teacher {
  id: string;
  name: string;
  email: string;
  schoolName: string | null;
  municipality: string | null;
  subsystem: string | null;
  createdAt: Date;
}

export interface TeacherProfile {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  schoolName?: string;
  municipality?: string;
  region?: string;
  subsystem?: string;
}
