;=======================================================================
;    TE13_BareBones_Ver1  TestVersion
;****************************************************************************

    VCL_App_Ver = 1010
;
;========================================================================
;   Description - Common Miscellaneous and Exception Variables
;========================================================================
Create HLC1_Spare       variable    ;empty byte for TRANSMIT
Create ByteSpaceFiller  variable    ;Used as a general variable when byte is to be skipped during reading

;=======================================================================
;   I/O Requirements - This is the area where specific hardware
;   requirements are communicated.
;-----------------------------------------------------------------------

;   PWM OUTPUTS
Driver_2_Mode  = 1;   Pin1
Driver_3_Mode  = 1;   Pin2
Driver_4_Mode  = 1;   Pin3
Driver_5_Mode  = 1;   Pin4

Driver_12_Mode     = 1
;Half_Bridge_2_Mode = 1
Half_Bridge_2_Mode = 0

; Digital Output
;Digital_Out_1_Mode = 1;
;Digital_Out_2_Mode = 1;  Try DigOut2 which goes through feedback Diode
Digital_Out_3_Mode = 1

cPWM_Output constant 1000                    ;all PWMs at 24 Volts

;------------------------------------
;    DELAYS
;------------------------------------
Startup_Delay                   alias               DLY1
Startup_Delay_Output            alias               DLY1_Output

;=============================================================================
;         Miscellaneous Variables
;
;=============================================================================
Create HLCSpaceFiller           variable;    ;used for unused bytes

;=======================================================================
;   One Time Initialization
;-----------------------------------------------------------------------
Setup_Delay(Startup_Delay,500)
while(Startup_Delay_Output <> 0){}

call Setup_Mailboxes

Put_Driver(SAFETY_OUT, 1)


;=======================================================================
;   Main Program Loop
;   The continuously running portion of the program should be placed
;   here.
;-----------------------------------------------------------------------
Mainloop:
   autouser300 = autouser300 + 1              ;Counter for testing


  ; to 0x98 Test FRONT and REAR
   call Handle_TestMessage_098;


goto Mainloop
;=======================================================================
;            Subroutine :: Setup_Mailboxes
;=======================================================================
Setup_Mailboxes:

;=====================================================================================================
;   TestMessage 0x98        sent by  for Testing Misc Drivers
;========================================================================================================
     Create TestMessage  variable ;0x98
     Create Activate_REAR             variable
     Create Activate_FRONT            variable
     Create Activate_PWM3                    variable
     Create Activate_PWM4                    variable
     Create Activate_PWM2_Switch          variable
     Create Activate_PWM5                    variable

     TestMessage =   assign_can_mailbox(CAN_PORT_1,C_RCV)
     Setup_CAN_Receive_Mailbox(TestMessage,0,0x98,0,0x7FF,0,0,50,40,0)
     Setup_CAN_Receive_Data (TestMessage, Activate_REAR      ,1,0);   Byte 0
     Setup_CAN_Receive_Data (TestMessage, Activate_FRONT     ,1,0);   Byte 1
     Setup_CAN_Receive_Data (TestMessage, Activate_PWM3             ,1,0);   Byte 2
     Setup_CAN_Receive_Data (TestMessage, Activate_PWM4             ,1,0);   Byte 3
     Setup_CAN_Receive_Data (TestMessage, Activate_PWM2_Switch   ,1,0);   Byte 4  Switch
     Setup_CAN_Receive_Data (TestMessage, Activate_PWM5    ,1,0);   Byte 5
     Setup_CAN_Receive_Data (TestMessage, ByteSpaceFiller           ,1,0);   Byte 6
     Setup_CAN_Receive_Data (TestMessage, ByteSpaceFiller           ,1,0);   Byte 7
     enable_receive_Mailbox(TestMessage);
;========================================================================================


;***********************************************************************
;   NMT CONTROL
;-----------------------------------------------------------------------
Setup_NMT_State(CAN_PORT_1,ENTER_OPERATIONAL)
Send_NMT(CAN_PORT_1,GLOBAL,ENTER_OPERATIONAL)

Return         ;End Setup Mailboxes
;======================================================================================
;      Subroutine Handle_TestMessage_098   DIRECT ACTIVATION of FRONT and REAR
;======================================================================================
Handle_TestMessage_098:

  if (Activate_REAR = 0)
  {Driver_12_Command = 0}    ;Rear  CHANGED TO HALF_BRIDGE 2
  else
  {Driver_12_Command = cPWM_Output
  autouser286 = autouser286 + 1}

  if (Activate_FRONT = 0);
  {Digital_Out_3_Command = 0}
  else
  {Digital_Out_3_Command = 1}


  if(Activate_PWM3         = 0)
   {Driver_3_Command = 0}
  else
   {Driver_3_Command = cPWM_Output}


   if (Activate_PWM4 = 0)
    {Driver_4_Command = 0}
   else
   {Driver_4_Command = cPWM_Output}

   if (Activate_PWM2_Switch = 0)
    {Driver_2_Command = 0}
   else
    {Driver_2_Command = cPWM_Output}

   if (Activate_PWM5 = 0)
    {Driver_5_Command = 0}
   else
    {Driver_5_Command = cPWM_Output}


Return
;======================================================================================
