using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Threading;

class PertashopApp
{
    [STAThread]
    static void Main(string[] args)
    {
        string currentDir = AppDomain.CurrentDomain.BaseDirectory;
        Directory.SetCurrentDirectory(currentDir);

        // 1. Cek apakah server localhost:3000 sudah berjalan
        bool isRunning = CheckServer("http://localhost:3000");

        if (!isRunning)
        {
            // Jalankan server di latar belakang secara tersembunyi (tanpa jendela CMD hitam)
            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = "cmd.exe";
            psi.Arguments = "/c npm run dev";
            psi.WorkingDirectory = currentDir;
            psi.WindowStyle = ProcessWindowStyle.Hidden;
            psi.CreateNoWindow = true;
            psi.UseShellExecute = false;

            try
            {
                Process.Start(psi);
            }
            catch { }

            // Tunggu hingga server siap (maksimal 12 detik)
            for (int i = 0; i < 24; i++)
            {
                Thread.Sleep(500);
                if (CheckServer("http://localhost:3000"))
                {
                    isRunning = true;
                    break;
                }
            }
        }

        // 2. Buka aplikasi dalam jendela Desktop Mandiri (Edge atau Chrome App Mode)
        string edgePath = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
        if (!File.Exists(edgePath))
            edgePath = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";

        string chromePath = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
        if (!File.Exists(chromePath))
            chromePath = @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe";

        string targetBrowser = null;
        if (File.Exists(edgePath)) targetBrowser = edgePath;
        else if (File.Exists(chromePath)) targetBrowser = chromePath;

        if (targetBrowser != null)
        {
            ProcessStartInfo appPsi = new ProcessStartInfo();
            appPsi.FileName = targetBrowser;
            appPsi.Arguments = "--app=http://localhost:3000 --window-size=1366,850";
            Process.Start(appPsi);
        }
        else
        {
            // Fallback: buka browser default sistem
            Process.Start("http://localhost:3000");
        }
    }

    static bool CheckServer(string url)
    {
        try
        {
            HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
            req.Timeout = 700;
            req.Method = "GET";
            using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
            {
                return true;
            }
        }
        catch
        {
            return false;
        }
    }
}
