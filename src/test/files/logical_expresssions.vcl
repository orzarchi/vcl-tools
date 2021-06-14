if ((pid_clamp == 0) ||
    (((pid_error < 0) && (pid_integral > 0)) ||
     ((pid_error > 0) && (pid_integral < 0))))
{
    pid_integral = pid_integral + (pid_error*delta_tics)
}
