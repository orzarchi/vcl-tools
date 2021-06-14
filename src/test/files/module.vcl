
Create  PID_Setpoint        variable
Create  PID_Feedback        variable

Create  PID_Kp              variable
Create  PID_Ki              variable
Create  PID_Kd              variable

Create  PID_Output          variable

Begin_Module FOS_Automate_PID

    PID_Dly                     equals  Dly32
    PID_Dly_Output              equals  Dly32_Output

    Create  current_time        variable
    Create  last_time           variable
    Create  delta_time          variable
    Create  delta_tics          variable
    PID_DLY_RELOAD_THRESHOLD    constant   1000
    PID_DLY_RELOAD_VALUE        constant   11000
    PID_TIC_TIME                constant   4

    Create pid_integral         variable
    Create pid_error            variable
    Create pid_error_back_1     variable
    Create pid_error_back_2     variable
    Create pid_clamp            variable
    Create pid_result           variable

    Call Calculate_Delta_Tic

    If(delta_tics > 0)
    {
        Call Run_PID_Calcs
    }
    Exit


    Calculate_Delta_Tic:

        current_time = PID_Dly_Output
        delta_time = last_time - current_time
        delta_tics = delta_time / PID_TIC_TIME
        last_time = last_time - (delta_tics * PID_TIC_TIME)

        If(current_time <= PID_DLY_RELOAD_THRESHOLD)
        {

            Setup_Delay(PID_Dly, PID_DLY_RELOAD_VALUE)
            current_time = PID_DLY_RELOAD_VALUE
            last_time = PID_DLY_RELOAD_VALUE
        }
    Return


    Run_PID_Calcs:

        pid_error_back_2 = pid_error_back_1;
        pid_error_back_1 = pid_error;


        pid_error = PID_Setpoint - PID_Feedback


        if ((pid_clamp == 0) ||
            (((pid_error < 0) && (pid_integral > 0)) ||
             ((pid_error > 0) && (pid_integral < 0))))
        {
            pid_integral = pid_integral + (pid_error*delta_tics)
        }


        pid_result = (((PID_Kp * pid_error) / 0x1FFF) +
                      ((PID_Ki * pid_integral)  / 0x1FFF) +


                      ((PID_Kd * (pid_error - pid_error_back_1)) / delta_tics / 0x1FFF))


        if (pid_result > 32767)
        {
            pid_clamp = 1;
            pid_result = 32767;
        }
        else if (pid_result < -32767)
        {
            pid_clamp = 1;
            pid_result = -32767;
        }
        else
        {
            pid_clamp = 0;
        }
        PID_Output = pid_result;
    Return


End_Module
