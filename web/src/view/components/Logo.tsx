interface LogoProps {
  className?: string
}

export function Logo({ className }: LogoProps) {
  return (
  <svg viewBox="0 0 139 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
<path fillRule="evenodd" clipRule="evenodd" d="M24.5833 10.1143H12.5149C9.59615 10.1143 7.76562 12.1812 7.76562 15.1071V23.0014C7.76562 25.9274 9.58605 27.9942 12.5149 27.9942H24.5819C27.5121 27.9942 29.334 25.9274 29.334 23.0014V15.1071C29.334 12.1812 27.5121 10.1143 24.5833 10.1143Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M12.4961 16.0645H24.5963" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M24.1134 10.1119L21.999 6.58774C20.4841 4.09277 17.8637 3.25101 15.3486 4.76731L5.01695 10.9853C2.51187 12.4901 2.00741 15.2042 3.51218 17.7194L7.59409 24.4735C7.78435 24.8007 7.9948 25.0947 8.2355 25.3585V25.3686" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M45.2825 12.2735H52.2058V25H49.9913V14.4116H45.2825V25H43.0681V14.4116H41.0319V12.2735H43.0681V11.8917C43.0681 8.53191 44.9262 6.85201 48.6423 6.85201C49.389 6.85201 50.2628 6.96231 51.264 7.1829V9.19369C50.1441 9.05794 49.2702 8.99006 48.6423 8.99006C47.4715 8.99006 46.6146 9.21066 46.0716 9.65184C45.5456 10.093 45.2825 10.8396 45.2825 11.8917V12.2735ZM61.9358 11.9426C63.429 11.9426 64.6253 12.4177 65.5246 13.368C66.424 14.3013 66.8736 15.5739 66.8736 17.1859V25H64.6592V17.3132C64.6592 16.2951 64.3793 15.4975 63.8193 14.9206C63.2593 14.3437 62.4872 14.0552 61.5031 14.0552C60.3662 14.0552 59.4668 14.4116 58.805 15.1242C58.1433 15.82 57.8124 16.8635 57.8124 18.255V25H55.598V12.2735H57.8124V14.1061C58.6947 12.6638 60.0692 11.9426 61.9358 11.9426ZM75.9464 25.3309C74.029 25.3309 72.4339 24.6946 71.1613 23.4219C69.8886 22.1323 69.2523 20.5372 69.2523 18.6368C69.2523 16.7363 69.8886 15.1497 71.1613 13.877C72.4339 12.5874 74.029 11.9426 75.9464 11.9426C77.2021 11.9426 78.3305 12.248 79.3317 12.8589C80.3328 13.4528 81.0795 14.2588 81.5716 15.277L79.7135 16.346C79.3911 15.6672 78.8905 15.1242 78.2118 14.717C77.55 14.3097 76.7949 14.1061 75.9464 14.1061C74.6738 14.1061 73.6048 14.5388 72.7394 15.4042C71.8909 16.2866 71.4667 17.3641 71.4667 18.6368C71.4667 19.8924 71.8909 20.9615 72.7394 21.8438C73.6048 22.7092 74.6738 23.1419 75.9464 23.1419C76.7949 23.1419 77.5585 22.9468 78.2372 22.5565C78.916 22.1493 79.4335 21.6063 79.7899 20.9275L81.6734 22.022C81.1134 23.0401 80.3244 23.8461 79.3062 24.44C78.2881 25.0339 77.1682 25.3309 75.9464 25.3309ZM90.1975 11.9426C91.6908 11.9426 92.8871 12.4177 93.7864 13.368C94.6858 14.3013 95.1354 15.5739 95.1354 17.1859V25H92.921V17.3132C92.921 16.2951 92.641 15.4975 92.0811 14.9206C91.5211 14.3437 90.749 14.0552 89.7648 14.0552C88.6279 14.0552 87.7286 14.4116 87.0668 15.1242C86.405 15.82 86.0742 16.8635 86.0742 18.255V25H83.8597V7.1829H86.0742V14.1061C86.9565 12.6638 88.331 11.9426 90.1975 11.9426ZM110.444 19.6549H99.7794C100 20.7748 100.518 21.6572 101.332 22.302C102.147 22.9298 103.165 23.2437 104.386 23.2437C106.066 23.2437 107.288 22.6244 108.052 21.3857L109.935 22.4547C108.679 24.3722 106.813 25.3309 104.335 25.3309C102.333 25.3309 100.687 24.703 99.3976 23.4474C98.1419 22.1577 97.5141 20.5542 97.5141 18.6368C97.5141 16.7023 98.1334 15.1073 99.3722 13.8516C100.611 12.5789 102.214 11.9426 104.183 11.9426C106.049 11.9426 107.568 12.6044 108.739 13.9279C109.927 15.2176 110.521 16.7956 110.521 18.6622C110.521 18.9846 110.495 19.3155 110.444 19.6549ZM104.183 14.0298C103.012 14.0298 102.028 14.3606 101.23 15.0224C100.45 15.6842 99.9661 16.5835 99.7794 17.7204H108.281C108.094 16.5496 107.627 15.6418 106.881 14.997C106.134 14.3522 105.235 14.0298 104.183 14.0298ZM119.023 25.3309C117.105 25.3309 115.51 24.6946 114.238 23.4219C112.965 22.1323 112.329 20.5372 112.329 18.6368C112.329 16.7363 112.965 15.1497 114.238 13.877C115.51 12.5874 117.105 11.9426 119.023 11.9426C120.278 11.9426 121.407 12.248 122.408 12.8589C123.409 13.4528 124.156 14.2588 124.648 15.277L122.79 16.346C122.467 15.6672 121.967 15.1242 121.288 14.717C120.626 14.3097 119.871 14.1061 119.023 14.1061C117.75 14.1061 116.681 14.5388 115.816 15.4042C114.967 16.2866 114.543 17.3641 114.543 18.6368C114.543 19.8924 114.967 20.9615 115.816 21.8438C116.681 22.7092 117.75 23.1419 119.023 23.1419C119.871 23.1419 120.635 22.9468 121.313 22.5565C121.992 22.1493 122.51 21.6063 122.866 20.9275L124.75 22.022C124.19 23.0401 123.401 23.8461 122.382 24.44C121.364 25.0339 120.244 25.3309 119.023 25.3309ZM131.416 18.4331L137.703 25H134.954L129.15 18.9676V25H126.936V7.1829H129.15V17.8986L134.648 12.2735H137.499L131.416 18.4331Z" fill="currentColor"/>
</svg>
  )
}
