namespace MauiApp1.Models.CourseModule;

public enum CourseStatus
{
    Open,
    Closed,
    Full,
    Upcoming
}

public enum ClassStatus
{
    Open,
    Full,
    Closed,
    Started,
    Finished
}

public enum RegistrationStatus
{
    PendingPayment,
    Confirmed,
    Cancelled
}

public enum PaymentStatus
{
    Unpaid,
    Pending,
    Paid,
    Failed,
    Cancelled
}

public sealed class Course
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string LicenseType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal TuitionFee { get; set; }
    public string Duration { get; set; } = string.Empty;
    public int TotalSessions { get; set; }
    public CourseStatus Status { get; set; }
    public string? ThumbnailUrl { get; set; }
    public string Content { get; set; } = string.Empty;
    public string Conditions { get; set; } = string.Empty;
    public string RequiredDocuments { get; set; } = string.Empty;
    public bool IsRegistered { get; set; }
}

public sealed class DrivingClass
{
    public long Id { get; set; }
    public long CourseId { get; set; }
    public string ClassCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string ScheduleText { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string? TeacherName { get; set; }
    public int MaxStudents { get; set; }
    public int CurrentStudents { get; set; }
    public int AvailableSlots { get; set; }
    public ClassStatus Status { get; set; }
}

public sealed class StudySchedule
{
    public long Id { get; set; }
    public long ClassId { get; set; }
    public DateTime Date { get; set; }
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? TeacherName { get; set; }
    public string Location { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public sealed class StudentRegistration
{
    public long Id { get; set; }
    public long StudentId { get; set; }
    public long CourseId { get; set; }
    public long ClassId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string IdentityNumber { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public RegistrationStatus RegistrationStatus { get; set; }
    public PaymentStatus PaymentStatus { get; set; }
    public decimal TotalAmount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class Payment
{
    public long Id { get; set; }
    public long RegistrationId { get; set; }
    public decimal Amount { get; set; }
    public string Method { get; set; } = "VNPAY";
    public string TransactionCode { get; set; } = string.Empty;
    public PaymentStatus Status { get; set; }
    public string PaymentUrl { get; set; } = string.Empty;
    public DateTime? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class CreateRegistrationRequest
{
    public long CourseId { get; set; }
    public long ClassId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string IdentityNumber { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
}

